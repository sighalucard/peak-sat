import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { EXAM_KINDS, UserError, parseConfig, parseState } from "@/lib/sessions";
import { getQuestion } from "@/content/bank";

const schema = z.object({ questionId: z.string(), level: z.number().int().min(1).max(3) });

/** Reveal hints up to `level`. Hints are never available in exam modes. */
export const POST = route(schema, async ({ userId, params, body }) => {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: params.id, userId } });
  const config = parseConfig(s.config);
  if (EXAM_KINDS.includes(config.kind)) throw new UserError("Hints are turned off in test mode.");
  const state = parseState(s.state);
  if (!state.order.includes(body.questionId)) throw new UserError("That question isn't part of this session.");
  const q = getQuestion(body.questionId);
  if (!q) throw new UserError("Question not found.");
  const a = (state.answers[body.questionId] ??= { timeMs: 0, hints: 0, guessed: false, marked: false });
  // Hints requested after answering don't count against the attempt.
  if (!a.graded) a.hints = Math.max(a.hints, body.level);
  await db.practiceSession.update({ where: { id: s.id }, data: { state: JSON.stringify(state) } });
  return { hints: q.hints.slice(0, body.level) };
});
