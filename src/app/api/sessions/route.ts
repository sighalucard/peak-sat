import { z } from "zod";
import { route } from "@/lib/api";
import { createSession } from "@/lib/sessions";
import { skillById } from "@/content/taxonomy";

const schema = z.object({
  kind: z.enum(["practice", "review", "timed", "diagnostic", "fulltest"]),
  skill: z.string().refine((s) => skillById.has(s), "Unknown skill").optional(),
  domain: z.enum(["II", "CS", "EOI", "SEC", "ALG", "ADV", "PSDA", "GEO"]).optional(),
  section: z.enum(["RW", "MATH"]).optional(),
  count: z.number().int().min(1).max(54).optional(),
  timeLimitSec: z.number().int().min(30).max(4 * 3600).nullable().optional(),
});

export const POST = route(schema, async ({ userId, body }) => {
  const s = await createSession(userId, { ...body, count: body.count ?? 10 });
  return { id: s.id };
});
