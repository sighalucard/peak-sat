import "server-only";
import { db } from "./db";
import { loadStudent } from "./student";
import { recommend } from "./recommend";
import { buildPlan } from "./plan";
import { dueReviews } from "./srs";
import type { Attempt } from "@prisma/client";

const DAY = 86400000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Days the student did meaningful study: at least 5 questions or a completed session. */
function studyDays(attempts: Attempt[], completedDays: string[]) {
  const counts = new Map<string, number>();
  for (const a of attempts) counts.set(dayKey(a.createdAt), (counts.get(dayKey(a.createdAt)) ?? 0) + 1);
  const days = new Set([...counts].filter(([, n]) => n >= 5).map(([d]) => d));
  completedDays.forEach((d) => days.add(d));
  return days;
}

export function streakFrom(days: Set<string>, now = new Date()) {
  let streak = 0;
  const d = new Date(now);
  // Today counts if done; if not done yet today, the streak from yesterday is still alive.
  if (!days.has(dayKey(d))) d.setTime(d.getTime() - DAY);
  while (days.has(dayKey(d))) {
    streak++;
    d.setTime(d.getTime() - DAY);
  }
  return streak;
}

export interface Badge { id: string; label: string; desc: string; earned: boolean }

export async function getOverview(userId: string) {
  const student = await loadStudent(userId);
  const [sessions, due, lessonViews] = await Promise.all([
    db.practiceSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" } }),
    dueReviews(userId, new Date(), 100),
    db.lessonView.findMany({ where: { userId } }),
  ]);
  const completed = sessions.filter((s) => s.status === "completed");
  const days = studyDays(student.attempts, completed.map((s) => dayKey(s.completedAt!)));
  const streak = streakFrom(days);
  let best = 0, run = 0;
  const sortedDays = [...days].sort();
  for (let i = 0; i < sortedDays.length; i++) {
    run = i > 0 && new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime() === DAY ? run + 1 : 1;
    best = Math.max(best, run);
  }

  // XP rewards accuracy on harder questions and clean (hint-free) solves, not volume:
  // wrong answers earn nothing, and mastery milestones are worth the most.
  let xp = 0;
  for (const a of student.attempts) if (a.correct) xp += a.difficulty * (a.hintsUsed ? 5 : 10) + (a.mode === "review" ? 5 : 0);
  const mastered = [...student.states.values()].filter((s) => s.mastery >= 0.85 && s.n >= 6);
  xp += mastered.length * 100;

  const weekAgo = Date.now() - 7 * DAY;
  const weekMinutes = Math.round(student.attempts.filter((a) => a.createdAt.getTime() >= weekAgo).reduce((t, a) => t + a.timeMs, 0) / 60000);

  const lessonsDone = new Set(lessonViews.map((l) => l.lessonId));
  const p = student.profile;
  const target = p?.targetScore ?? null;
  const est = student.estimates;
  const estTotal = est.RW && est.MATH ? { mid: est.RW.mid + est.MATH.mid, low: est.RW.low + est.MATH.low, high: est.RW.high + est.MATH.high } : null;
  const sectionGap = target && est.RW && est.MATH ? { RW: target / 2 - est.RW.mid, MATH: target / 2 - est.MATH.mid } : undefined;
  const recs = recommend(student.states, { sectionGap, lessonsDone });

  const today = dayKey(new Date());
  const todaySessions = completed.filter((s) => dayKey(s.completedAt!) === today);
  const doneToday = {
    kinds: new Set(todaySessions.map((s) => s.kind)),
    skills: new Set(todaySessions.map((s) => (JSON.parse(s.config).skill as string) ?? "").filter(Boolean)),
    lessons: new Set(lessonViews.filter((l) => dayKey(l.completedAt) === today).map((l) => l.lessonId)),
  };
  const last = student.attempts.at(-1)?.createdAt ?? null;
  const fullTests = completed.filter((s) => s.kind === "fulltest");
  const plan = buildPlan({
    dailyMinutes: p?.dailyMinutes ?? 30,
    dueReviews: due.length,
    recs,
    lessonsDone,
    daysToTest: p?.testDate ? Math.ceil((p.testDate.getTime() - Date.now()) / DAY) : null,
    hasDiagnostic: completed.some((s) => s.kind === "diagnostic"),
    totalAttempts: student.attempts.length,
    daysSinceLastStudy: last ? Math.floor((Date.now() - last.getTime()) / DAY) : null,
    fullTestsTaken: fullTests.length,
    daysSinceFullTest: fullTests[0]?.completedAt ? Math.floor((Date.now() - fullTests[0].completedAt.getTime()) / DAY) : null,
    doneToday,
  });

  const badges: Badge[] = [
    { id: "diag", label: "Baseline set", desc: "Completed the diagnostic", earned: completed.some((s) => s.kind === "diagnostic") },
    { id: "streak7", label: "7-day streak", desc: "Studied 7 days in a row", earned: best >= 7 },
    { id: "streak30", label: "30-day streak", desc: "Studied 30 days in a row", earned: best >= 30 },
    { id: "master1", label: "First mastery", desc: "Reached an estimated 85%+ on a skill", earned: mastered.length >= 1 },
    { id: "master5", label: "Five skills mastered", desc: "85%+ on five skills", earned: mastered.length >= 5 },
    { id: "review", label: "Learning from mistakes", desc: "Answered 20 review questions correctly", earned: student.attempts.filter((a) => a.mode === "review" && a.correct).length >= 20 },
    { id: "fulltest", label: "Test day rehearsal", desc: "Completed a full-length practice test", earned: fullTests.length >= 1 },
    { id: "nohints", label: "Independent solver", desc: "10 hard questions right without hints", earned: student.attempts.filter((a) => a.correct && a.difficulty === 3 && !a.hintsUsed).length >= 10 },
  ];

  return {
    student, sessions, completed, due, recs, plan, streak, bestStreak: best, xp, mastered, weekMinutes, badges, lessonsDone, estTotal, target,
    active: sessions.filter((s) => s.status === "active"),
  };
}
export type Overview = Awaited<ReturnType<typeof getOverview>>;
