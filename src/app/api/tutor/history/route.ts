import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/api";

// Clears the general tutor conversation.
export const POST = route(z.object({ threadKey: z.string().max(200) }), async ({ userId, body }) => {
  await db.chatMessage.deleteMany({ where: { userId, threadKey: body.threadKey } });
  return { ok: true };
});
