import { route } from "@/lib/api";
import { finishPractice } from "@/lib/sessions";

export const POST = route(null, async ({ userId, params }) => {
  await finishPractice(userId, params.id);
  return { ok: true };
});
