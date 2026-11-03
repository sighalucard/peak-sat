import { z } from "zod";
import { route } from "@/lib/api";
import { saveExamState } from "@/lib/sessions";

const answer = z.object({
  response: z.string().max(20).optional(),
  marked: z.boolean().optional(),
  guessed: z.boolean().optional(),
  eliminated: z.array(z.string()).max(4).optional(),
  timeMs: z.number().min(0).optional(),
});
const schema = z.object({
  answers: z.record(z.string(), answer),
  current: z.number().int().min(0),
  remainingSec: z.number().nullable().optional(),
  breakRemainingSec: z.number().optional(),
});

export const POST = route(schema, async ({ userId, params, body }) => {
  await saveExamState(userId, params.id, body);
  return { ok: true };
});
