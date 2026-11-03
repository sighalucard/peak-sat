import { route } from "@/lib/api";
import { endBreak } from "@/lib/sessions";

export const POST = route(null, async ({ userId, params }) => {
  await endBreak(userId, params.id);
  return { ok: true };
});
