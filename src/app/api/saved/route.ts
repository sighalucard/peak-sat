import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { questionById } from "@/content/bank";

export const POST = route(z.object({ questionId: z.string().refine((id) => questionById.has(id)), saved: z.boolean() }), async ({ userId, body }) => {
  if (body.saved) {
    await db.savedQuestion.upsert({ where: { userId_questionId: { userId, questionId: body.questionId } }, create: { userId, questionId: body.questionId }, update: {} });
  } else {
    await db.savedQuestion.deleteMany({ where: { userId, questionId: body.questionId } });
  }
  return { ok: true };
});
