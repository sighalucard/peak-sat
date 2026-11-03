// Personalized daily study plan. Built fresh each day from current data, so a missed
// day never piles up: reviews are capped and the plan always fits today's time budget.

import { skillName } from "@/content/taxonomy";
import { lessonById } from "@/content/lessons";
import type { Recommendation } from "./recommend";

export interface PlanBlock {
  id: string;
  minutes: number;
  title: string;
  why: string;
  kind: "review" | "lesson" | "practice" | "timed" | "diagnostic" | "fulltest" | "break";
  start?: { kind: string; skill?: string; section?: string; count?: number; timeLimitSec?: number | null };
  href?: string;
  done?: boolean;
}

export interface PlanInput {
  dailyMinutes: number;
  dueReviews: number;
  recs: Recommendation[];
  lessonsDone: Set<string>;
  daysToTest: number | null;
  hasDiagnostic: boolean;
  totalAttempts: number;
  daysSinceLastStudy: number | null;
  fullTestsTaken: number;
  daysSinceFullTest: number | null;
  /** Skills/kinds the student already completed today, used to tick blocks off. */
  doneToday: { kinds: Set<string>; skills: Set<string>; lessons: Set<string> };
}

const QUESTION_MIN = 1.5; // average minutes per untimed practice question including review of the explanation

export function buildPlan(p: PlanInput): { blocks: PlanBlock[]; notes: string[] } {
  const M = Math.max(10, p.dailyMinutes);
  const blocks: PlanBlock[] = [];
  const notes: string[] = [];
  let left = M;

  if (p.daysSinceLastStudy != null && p.daysSinceLastStudy >= 2) {
    notes.push(`Welcome back! It's been ${p.daysSinceLastStudy} days. Today's plan is the same size as usual. Missed days don't pile up, and reviews are capped so you can ease back in.`);
  }

  if (!p.hasDiagnostic && p.totalAttempts < 15) {
    blocks.push({ id: "diag", minutes: Math.min(30, M), title: "Take the diagnostic", why: "It measures all 8 SAT domains so the rest of your plan is based on real data, not guesses.", kind: "diagnostic", start: { kind: "diagnostic" }, done: p.doneToday.kinds.has("diagnostic") });
    left -= Math.min(30, M);
  }

  // 1) Spaced review first: retrieval at the right time is the highest-value use of minutes.
  if (p.dueReviews > 0 && left >= 5) {
    const n = Math.min(p.dueReviews, 15, Math.floor((M * 0.35) / QUESTION_MIN) || 1);
    const min = Math.max(5, Math.round(n * QUESTION_MIN));
    blocks.push({ id: "review", minutes: min, title: `Review ${n} question${n === 1 ? "" : "s"} you missed or found hard`, why: "Spaced review brings back questions right before you'd forget them. Some are swapped for a fresh question on the same skill so you learn the concept, not the answer.", kind: "review", start: { kind: "review" }, done: p.doneToday.kinds.has("review") });
    left -= min;
  }

  const near = p.daysToTest != null && p.daysToTest <= 21;
  const needFullTest = p.hasDiagnostic && M >= 60 && (p.fullTestsTaken === 0 ? (p.daysToTest == null || p.daysToTest <= 60) : (p.daysSinceFullTest ?? 99) >= 7);
  if (needFullTest && near) notes.push("Your test is close. Plan a full-length practice test on a day when you have about 2 hours and 15 minutes, ideally at the same time of day as your real test.");

  // 2) Targeted practice on the top priorities (interleaving two skills when time allows).
  const top = p.recs.filter((r) => r.action !== "maintain").slice(0, 3);
  for (const [i, r] of top.entries()) {
    if (left < 6) break;
    const lesson = lessonById.get(r.skill);
    if (r.action === "lesson" || (r.mastery < 0.45 && r.n >= 3 && lesson && !p.lessonsDone.has(r.skill))) {
      if (lesson && left >= lesson.minutes + 4) {
        blocks.push({ id: `lesson-${r.skill}`, minutes: lesson.minutes, title: `Lesson: ${lesson.title}`, why: r.action === "lesson" ? r.reason : "Your accuracy here is low, so understanding the concept first will make practice more effective.", kind: "lesson", href: `/lessons/${r.skill}`, done: p.doneToday.lessons.has(r.skill) });
        left -= lesson.minutes;
      }
    }
    const share = i === 0 ? 0.5 : 0.5;
    const min = Math.max(6, Math.min(left, Math.round((i === 0 ? left * share : left * 0.6))));
    if (min < 6) break;
    const count = Math.max(3, Math.min(20, Math.round(min / QUESTION_MIN)));
    blocks.push({
      id: `practice-${r.skill}`, minutes: min, title: `${r.action === "diagnose" ? "Check" : "Practice"}: ${skillName(r.skill)} (${count} questions)`,
      why: r.reason, kind: "practice", start: { kind: "practice", skill: r.skill, count }, done: p.doneToday.skills.has(r.skill),
    });
    left -= min;
    if (i === 0 && near && left >= 10) break; // leave room for timed work near the test
  }

  // 3) Timed practice: more of it as the test approaches.
  if (left >= 8 && (near || M >= 45)) {
    const n = Math.min(10, Math.max(4, Math.floor(left / 1.4)));
    const section = p.recs[0]?.section ?? "MATH";
    const per = section === "RW" ? 71 : 95; // official average seconds per question
    blocks.push({ id: "timed", minutes: Math.round((n * per) / 60), title: `Timed set: ${n} ${section === "RW" ? "Reading and Writing" : "Math"} questions`, why: near ? "With your test coming up, practicing at real pace builds timing and endurance." : "A short timed set builds pacing without taking over your day.", kind: "timed", start: { kind: "timed", section, count: n, timeLimitSec: n * per }, done: p.doneToday.kinds.has("timed") });
    left -= Math.round((n * per) / 60);
  }

  if (M >= 50) blocks.splice(Math.ceil(blocks.length / 2), 0, { id: "break", minutes: 5, title: "Short break", why: "A brief break in a longer session helps you stay focused for the second half.", kind: "break" });

  if (needFullTest) {
    blocks.push({ id: "fulltest", minutes: 135, title: "Optional: full-length practice test", why: p.fullTestsTaken === 0 ? "A full test shows how your skills hold up under real timing and fatigue." : "It's been a week or more since your last full test. Another one measures your progress.", kind: "fulltest", href: "/tests", done: p.doneToday.kinds.has("fulltest") });
  }
  if (blocks.filter((b) => b.kind !== "break" && b.kind !== "fulltest").length === 0) {
    blocks.push({ id: "smart", minutes: M, title: "Smart practice", why: "A mix of your highest-priority skills.", kind: "practice", start: { kind: "practice", count: Math.round(M / QUESTION_MIN) } });
  }
  return { blocks, notes };
}
