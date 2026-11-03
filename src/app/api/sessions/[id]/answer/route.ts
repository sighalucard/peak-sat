import { z } from "zod";
import { route } from "@/lib/api";
import { answerImmediate, parseState } from "@/lib/sessions";
import { feedbackFor } from "@/lib/feedback";
import { db } from "@/lib/db";

const schema = z.object({ questionId: z.string(), response: z.string().trim().min(1).max(20), timeMs: z.number().min(0), guessed: z.boolean().default(false) });

export const POST = route(schema, async ({ userId, params, body }) => {
  const r = await answerImmediate(userId, params.id, body.questionId, body);
  const s = await db.practiceSession.findUniqueOrThrow({ where: { id: params.id } });
  const state = parseState(s.state);
  return {
    feedback: feedbackFor(r.q, body.response),
    attempt: { id: r.attempt.id, mistakeCategory: r.mistake, mistakeConfirmed: false },
    done: r.done,
    suggestLesson: !r.grade.correct && state.suggestLesson ? state.suggestLesson : null,
  };
});
