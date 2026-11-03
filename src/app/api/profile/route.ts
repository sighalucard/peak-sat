import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/api";

const score = z.number().int().min(400).max(1600).nullable().optional();
const schema = z.object({
  currentScore: score,
  targetScore: score,
  testDate: z.string().nullable().optional(),
  dailyMinutes: z.number().int().min(10).max(240).nullable().optional(),
  strongest: z.enum(["RW", "MATH"]).nullable().optional(),
  weakest: z.enum(["RW", "MATH"]).nullable().optional(),
  takenBefore: z.boolean().nullable().optional(),
  hintDelayFactor: z.number().min(0.5).max(3).optional(),
  autoHintNudges: z.boolean().optional(),
  weeklyGoalMin: z.number().int().min(30).max(1500).nullable().optional(),
  onboarded: z.boolean().optional(),
  name: z.string().trim().max(60).optional(),
});

export const POST = route(schema, async ({ userId, body }) => {
  const { name, testDate, ...rest } = body;
  if (rest.strongest && rest.weakest && rest.strongest === rest.weakest) rest.weakest = null;
  let date: Date | null | undefined = undefined;
  if (testDate !== undefined) {
    date = testDate ? new Date(testDate) : null;
    if (date && isNaN(date.getTime())) date = null;
  }
  const data = { ...rest, ...(date !== undefined ? { testDate: date } : {}) };
  await db.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  if (name !== undefined) await db.user.update({ where: { id: userId }, data: { name: name || null } });
  return { ok: true };
});
