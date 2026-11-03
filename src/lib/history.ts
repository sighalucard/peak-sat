import { computeSkillStates, estimateSection, type AttemptLite } from "./mastery";

/** Section score estimate at the end of each study day (only days where an estimate exists). */
export function scoreHistory(attempts: AttemptLite[], priors: Partial<Record<"RW" | "MATH", number>>, section: "RW" | "MATH") {
  const days = [...new Set(attempts.map((a) => a.createdAt.toISOString().slice(0, 10)))].sort();
  const out: { label: string; value: number; low: number; high: number }[] = [];
  for (const d of days) {
    const upTo = attempts.filter((a) => a.createdAt.toISOString().slice(0, 10) <= d);
    const e = estimateSection(computeSkillStates(upTo, priors), section);
    if (e) out.push({ label: new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: e.mid, low: e.low, high: e.high });
  }
  return out.slice(-30);
}
