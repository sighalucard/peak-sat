import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { lessonById } from "@/content/lessons";
import { UserError } from "@/lib/sessions";

export const POST = route(null, async ({ userId, params }) => {
  if (!lessonById.has(params.id)) throw new UserError("Unknown lesson.");
  await db.lessonView.upsert({ where: { userId_lessonId: { userId, lessonId: params.id } }, create: { userId, lessonId: params.id }, update: { completedAt: new Date() } });
  return { ok: true };
});
