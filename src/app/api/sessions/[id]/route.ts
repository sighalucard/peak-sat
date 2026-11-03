import { db } from "@/lib/db";
import { route } from "@/lib/api";
import { sessionView } from "@/lib/session-view";

export const GET = route(null, async ({ userId, params }) => {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: params.id, userId } });
  return sessionView(s, userId);
});
