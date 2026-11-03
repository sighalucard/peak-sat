// "What should I study next to improve my score the most?"
// Ranks skills by expected score gain per unit of study time, using the student's own data.

import { SKILLS, skillById, skillTestWeight, domainById } from "@/content/taxonomy";
import type { SkillState } from "./mastery";

export interface Recommendation {
  skill: string;
  section: "RW" | "MATH";
  priority: number;
  mastery: number;
  n: number;
  action: "diagnose" | "practice" | "lesson" | "maintain";
  reason: string;
}

const sectionOf = (skill: string) =>
  domainById.get(skillById.get(skill)!.domain)!.section;

export function recommend(
  states: Map<string, SkillState>,
  opts: { sectionGap?: Partial<Record<"RW" | "MATH", number>>; lessonsDone?: Set<string> } = {},
): Recommendation[] {
  const out: Recommendation[] = [];
  for (const s of SKILLS) {
    const st = states.get(s.id)!;
    const section = sectionOf(s.id);
    const weight = skillTestWeight(s.id);
    const headroom = 1 - st.mastery;
    let gainability = 1;
    let action: Recommendation["action"] = "practice";
    let reason: string;

    if (st.n < 3) {
      gainability = 1.05;
      action = "diagnose";
      reason = st.n === 0 ? "No data yet. A few questions will show where you stand." : "Only a little data so far. A few more questions will sharpen the picture.";
    } else if (st.mastery > 0.85 && st.n >= 6) {
      gainability = 0.15;
      action = "maintain";
      reason = "Looks mastered. Light review only, so you don't spend time you could use elsewhere.";
    } else {
      const trend = st.masteryEarlier == null ? 0 : st.mastery - st.masteryEarlier;
      if (st.n >= 12 && trend < 0.03) {
        // Lots of practice without progress: more of the same is unlikely to help; switch method.
        gainability = 0.7;
        action = opts.lessonsDone?.has(s.id) ? "practice" : "lesson";
        reason = action === "lesson"
          ? `Accuracy hasn't moved after ${st.n} questions. A short concept lesson is likely to help more than more drilling.`
          : `Progress has stalled after ${st.n} questions. Try easier questions and use the tutor to find the gap.`;
      } else if (trend > 0.05) {
        gainability = 1.15;
        reason = "You're improving here, and more practice is paying off.";
      } else {
        reason = `${Math.round(st.mastery * 100)}% estimated accuracy, and this skill is about ${Math.round(weight * 100)}% of the ${section === "RW" ? "Reading and Writing" : "Math"} section.`;
      }
    }

    const gapBoost = 1 + Math.max(0, opts.sectionGap?.[section] ?? 0) / 200;
    out.push({ skill: s.id, section, priority: weight * headroom * gainability * gapBoost, mastery: st.mastery, n: st.n, action, reason });
  }
  return out.sort((a, b) => b.priority - a.priority);
}
