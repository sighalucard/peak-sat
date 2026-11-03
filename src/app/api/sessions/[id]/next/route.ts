import { route } from "@/lib/api";
import { nextPracticeQuestion } from "@/lib/sessions";

export const POST = route(null, async ({ userId, params }) => {
  const id = await nextPracticeQuestion(userId, params.id);
  return { questionId: id };
});
