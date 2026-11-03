import "server-only";
import { db } from "./db";
import { computeSkillStates, estimateSection, priorFromScore, type AttemptLite } from "./mastery";
import type { Profile } from "@prisma/client";

/** Split a self-reported total score into section priors, nudged by strongest/weakest. */
export function sectionPriors(profile: Profile | null) {
  if (!profile?.currentScore) return {};
  const half = profile.currentScore / 2;
  const adj = (sec: "RW" | "MATH") =>
    half + (profile.strongest === sec ? 40 : 0) - (profile.weakest === sec ? 40 : 0);
  return { RW: priorFromScore(adj("RW")), MATH: priorFromScore(adj("MATH")) };
}

export async function loadStudent(userId: string) {
  const [profile, attempts] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.attempt.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);
  const lite: AttemptLite[] = attempts;
  const states = computeSkillStates(lite, sectionPriors(profile));
  return {
    profile,
    attempts,
    states,
    estimates: { RW: estimateSection(states, "RW"), MATH: estimateSection(states, "MATH") },
  };
}

export type StudentData = Awaited<ReturnType<typeof loadStudent>>;
