import { z } from "zod";
import { route } from "@/lib/api";
import { submitExam } from "@/lib/sessions";

export const POST = route(z.object({ ranOutOfTime: z.boolean().optional() }), async ({ userId, params, body }) => submitExam(userId, params.id, body));
