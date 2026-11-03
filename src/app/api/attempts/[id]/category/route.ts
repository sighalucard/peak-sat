import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { MISTAKE_CATEGORIES } from "@/content/taxonomy";

const ids = MISTAKE_CATEGORIES.map((m) => m.id) as [string, ...string[]];

export const POST = route(z.object({ category: z.enum(ids) }), async ({ userId, params, body }) => {
  const a = await db.attempt.findFirstOrThrow({ where: { id: params.id, userId } });
  await db.attempt.update({ where: { id: a.id }, data: { mistakeCategory: body.category, mistakeConfirmed: true } });
  return { ok: true };
});
