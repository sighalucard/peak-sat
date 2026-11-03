import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { apiUserId } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { getQuestion } from "@/content/bank";
import { EXAM_KINDS, parseConfig, parseState } from "@/lib/sessions";
import { grade } from "@/lib/grading";
import { TUTOR_MODEL, TUTOR_SYSTEM, TUTOR_UNAVAILABLE, anthropic, leaksAnswer, questionContext, tutorConfigured } from "@/lib/tutor";
import { rateLimited } from "@/lib/ratelimit";

const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  sessionId: z.string().optional(),
  questionId: z.string().optional(),
});

const SAFE_HINT_REPLY =
  "I can't give the answer away before you submit, but here's how to keep going: reread the question and use the hint button for a nudge on the next step. Once you submit, I can walk through the full solution.";

export async function POST(req: Request) {
  try {
    const userId = await apiUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const body = schema.parse(await req.json().catch(() => ({})));
    if (rateLimited(`tutor:${userId}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "You've sent a lot of tutor messages this hour. Take a short break and try again soon." }, { status: 429 });
    }

    let context = "";
    let threadKey = "general";
    let preAnswer = false;
    let question = null as ReturnType<typeof getQuestion> | null;

    if (body.questionId) {
      question = getQuestion(body.questionId) ?? null;
      if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
      let answered = false, response: string | null = null;
      if (body.sessionId) {
        const s = await db.practiceSession.findFirst({ where: { id: body.sessionId, userId } });
        if (!s) return NextResponse.json({ error: "Session not found." }, { status: 404 });
        const config = parseConfig(s.config);
        if (EXAM_KINDS.includes(config.kind) && s.status === "active") {
          return NextResponse.json({ error: "The tutor is turned off during test mode. It'll be available when you review your results." }, { status: 403 });
        }
        const state = parseState(s.state);
        if (!state.order.includes(question.id) && !(config.modules ?? []).some((m) => m.questionIds.includes(question!.id))) {
          return NextResponse.json({ error: "That question isn't part of this session." }, { status: 400 });
        }
        const a = state.answers[question.id];
        answered = !!a?.graded || (EXAM_KINDS.includes(config.kind) && s.status === "completed");
        response = a?.response ?? null;
      } else {
        // Outside a session (e.g. reviewing a saved or missed question), only allow
        // questions the student has already attempted.
        const last = await db.attempt.findFirst({ where: { userId, questionId: question.id }, orderBy: { createdAt: "desc" } });
        if (!last) return NextResponse.json({ error: "Answer this question first, then ask the tutor about it." }, { status: 400 });
        answered = true;
        response = last.selected;
      }
      preAnswer = !answered;
      context = questionContext(question, { answered, response, correct: answered ? grade(question, response).correct : undefined });
      threadKey = `q:${body.sessionId ?? "x"}:${question.id}:${answered ? "post" : "pre"}`;
    }

    if (!tutorConfigured()) return NextResponse.json({ error: TUTOR_UNAVAILABLE, code: "not_configured" }, { status: 503 });

    const history = await db.chatMessage.findMany({ where: { userId, threadKey }, orderBy: { createdAt: "desc" }, take: 16 });
    const messages: Anthropic.Beta.BetaMessageParam[] = history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    messages.push({ role: "user", content: body.message });
    await db.chatMessage.create({ data: { userId, threadKey, role: "user", content: body.message } });

    const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: "text", text: TUTOR_SYSTEM, cache_control: { type: "ephemeral" } }];
    if (context) system.push({ type: "text", text: `Current question context:\n${context}` });

    const stream = anthropic().beta.messages.stream({
      model: TUTOR_MODEL,
      max_tokens: 4000,
      system,
      messages,
      output_config: { effort: "medium" },
    });

    const encoder = new TextEncoder();
    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        let text = "";
        try {
          if (preAnswer) {
            // Buffer in hint mode so the answer-leak guard can run before anything is shown.
            const final = await stream.finalMessage();
            text = final.content.map((b) => (b.type === "text" ? b.text : "")).join("");
            if (final.stop_reason === "refusal") text = "I can't help with that request. Try asking about the question's concept instead.";
            if (question && leaksAnswer(question, text)) text = SAFE_HINT_REPLY;
            controller.enqueue(encoder.encode(text));
          } else {
            stream.on("text", (delta) => {
              text += delta;
              controller.enqueue(encoder.encode(delta));
            });
            const final = await stream.finalMessage();
            if (final.stop_reason === "refusal") {
              const note = "\n\nI can't continue with that. Try asking about the question's concept instead.";
              text += note;
              controller.enqueue(encoder.encode(note));
            }
          }
          if (text.trim()) await db.chatMessage.create({ data: { userId, threadKey, role: "assistant", content: text } });
        } catch (e) {
          console.error("tutor error", e);
          const msg = e instanceof Anthropic.AuthenticationError
            ? "\n\n[The tutor's API key was rejected. An administrator needs to update it.]"
            : e instanceof Anthropic.RateLimitError
              ? "\n\n[The tutor is busy right now. Please try again in a minute.]"
              : "\n\n[The tutor couldn't finish this reply because of a connection problem. Please try again.]";
          controller.enqueue(encoder.encode(msg));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
