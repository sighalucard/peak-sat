import "server-only";
import type { PracticeSession } from "@prisma/client";
import { getQuestion, toPublic } from "@/content/bank";
import { EXAM_KINDS, parseConfig, parseState, type SessionResult } from "./sessions";
import { feedbackFor } from "./feedback";
import { db } from "./db";

/** What the browser gets for a session. Answer keys are only included once a question is graded. */
export async function sessionView(s: PracticeSession, userId: string) {
  const config = parseConfig(s.config);
  const state = parseState(s.state);
  const exam = EXAM_KINDS.includes(config.kind);
  const done = s.status === "completed";
  const ids = done && config.kind === "fulltest" ? config.modules!.flatMap((m) => m.questionIds) : state.order;
  const attempts = await db.attempt.findMany({ where: { userId, sessionId: s.id }, select: { id: true, questionId: true, mistakeCategory: true, mistakeConfirmed: true } });
  const attemptByQ = new Map(attempts.map((a) => [a.questionId, a]));
  const saved = new Set((await db.savedQuestion.findMany({ where: { userId, questionId: { in: ids } }, select: { questionId: true } })).map((x) => x.questionId));
  const questions = ids.map((id) => {
    const q = getQuestion(id);
    if (!q) return null;
    const a = state.answers[id];
    const revealed = !!a?.graded && (!exam || done);
    const at = attemptByQ.get(id);
    return {
      q: toPublic(q),
      answer: a ? { response: a.response ?? null, marked: a.marked, guessed: a.guessed, eliminated: a.eliminated ?? [], timeMs: a.timeMs, hints: a.hints } : null,
      revealedHints: !exam && a?.hints ? q.hints.slice(0, Math.min(a.hints, 3)) : [],
      feedback: revealed ? feedbackFor(q, a?.response) : null,
      attempt: revealed && at ? { id: at.id, mistakeCategory: at.mistakeCategory, mistakeConfirmed: at.mistakeConfirmed } : null,
      saved: saved.has(id),
    };
  }).filter(Boolean);
  const mod = config.modules?.[state.moduleIdx ?? 0];
  return {
    id: s.id,
    kind: config.kind,
    title: s.title,
    status: s.status,
    exam,
    count: config.count,
    timeLimitSec: config.kind === "fulltest" ? mod?.timeLimitSec ?? null : config.timeLimitSec ?? null,
    remainingSec: state.remainingSec ?? null,
    current: state.current,
    phase: state.phase ?? null,
    breakRemainingSec: state.breakRemainingSec ?? null,
    module: mod ? { section: mod.section, index: mod.index, number: (state.moduleIdx ?? 0) + 1, of: 4 } : null,
    suggestLesson: state.suggestLesson ?? null,
    questions,
    result: s.result ? (JSON.parse(s.result) as SessionResult) : null,
  };
}
export type SessionView = Awaited<ReturnType<typeof sessionView>>;
