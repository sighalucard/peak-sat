// Spaced repetition scheduling (SM-2 variant). Missed questions, and questions answered
// correctly but with hints or slowly, are scheduled for review; clean correct answers
// push the next review further out until the item is retired.

import { db } from "./db";

const DAY = 24 * 60 * 60 * 1000;
export const RETIRE_AFTER_DAYS = 60;

export interface ReviewOutcome {
  correct: boolean;
  hintsUsed: number;
  timeMs: number;
  expectedSec: number;
  guessed: boolean;
}

/** 0 = miss, 3 = correct with help or a guess, 4 = correct but slow, 5 = clean. */
export function quality(o: ReviewOutcome) {
  if (!o.correct) return 0;
  if (o.hintsUsed > 0 || o.guessed) return 3;
  if (o.timeMs > o.expectedSec * 1500) return 4;
  return 5;
}

export function nextSchedule(prev: { ease: number; intervalDays: number; reps: number; lapses: number } | null, q: number) {
  const s = prev ?? { ease: 2.3, intervalDays: 0, reps: 0, lapses: 0 };
  if (q < 3) {
    return { ease: Math.max(1.3, s.ease - 0.2), intervalDays: 1, reps: 0, lapses: s.lapses + 1 };
  }
  const ease = Math.max(1.3, s.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const reps = s.reps + 1;
  const intervalDays = reps === 1 ? (q === 5 ? 3 : 1) : reps === 2 ? 6 : Math.round(s.intervalDays * ease);
  return { ease, intervalDays, reps, lapses: s.lapses };
}

/**
 * Update (or create) the review item for a question after an attempt.
 * A clean first-time correct answer doesn't create an item, since there is nothing to review.
 */
export async function recordReview(userId: string, questionId: string, skill: string, o: ReviewOutcome, now = new Date()) {
  const q = quality(o);
  const existing = await db.reviewItem.findUnique({ where: { userId_questionId: { userId, questionId } } });
  if (!existing && q === 5) return null;
  const next = nextSchedule(existing, q);
  const data = {
    ...next,
    skill,
    dueAt: new Date(now.getTime() + next.intervalDays * DAY),
    lastSeenAt: now,
    retired: next.intervalDays >= RETIRE_AFTER_DAYS,
  };
  return db.reviewItem.upsert({
    where: { userId_questionId: { userId, questionId } },
    create: { userId, questionId, ...data },
    update: data,
  });
}

export async function dueReviews(userId: string, now = new Date(), limit = 50) {
  return db.reviewItem.findMany({
    where: { userId, retired: false, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take: limit,
  });
}
