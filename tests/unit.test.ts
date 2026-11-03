import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeSPR, parseSPR, fmt } from "../src/content/math-util";
import { nextSchedule, quality } from "../src/lib/srs";
import { computeSkillStates, estimateSection, proportionToScore, scoreToProportion, targetDifficulty, pCorrect } from "../src/lib/mastery";
import { recommend } from "../src/lib/recommend";
import { buildPlan } from "../src/lib/plan";
import { leaksAnswer } from "../src/lib/tutor";
import { validateQuestion } from "../src/content/validate";
import { buildMathQuestions } from "../src/content/math-templates";
import { RW_CONVENTIONS } from "../src/content/rw-conventions";
import type { MCQuestion } from "../src/content/types";

test("SPR grading accepts equivalent forms", () => {
  assert.equal(parseSPR("7/2"), 3.5);
  assert.equal(parseSPR("−3"), -3);
  assert.ok(gradeSPR("3.5", [3.5]));
  assert.ok(gradeSPR("7/2", [3.5]));
  assert.ok(gradeSPR(".6666", [2 / 3]));
  assert.ok(gradeSPR(".6667", [2 / 3]));
  assert.ok(!gradeSPR(".67", [2 / 3]), "too few digits for a repeating decimal");
  assert.ok(!gradeSPR("abc", [1]));
  assert.ok(!gradeSPR("1/0", [1]));
  assert.equal(fmt(11.000000000000002), "11");
});

test("spaced repetition: misses come back tomorrow, clean answers spread out", () => {
  assert.equal(quality({ correct: false, hintsUsed: 0, timeMs: 1, expectedSec: 60, guessed: false }), 0);
  assert.equal(quality({ correct: true, hintsUsed: 1, timeMs: 1, expectedSec: 60, guessed: false }), 3);
  assert.equal(quality({ correct: true, hintsUsed: 0, timeMs: 1, expectedSec: 60, guessed: true }), 3);
  assert.equal(quality({ correct: true, hintsUsed: 0, timeMs: 200000, expectedSec: 60, guessed: false }), 4);
  const miss = nextSchedule(null, 0);
  assert.equal(miss.intervalDays, 1);
  let s = nextSchedule(miss, 5);
  const intervals = [s.intervalDays];
  for (let i = 0; i < 4; i++) { s = nextSchedule(s, 5); intervals.push(s.intervalDays); }
  for (let i = 1; i < intervals.length; i++) assert.ok(intervals[i] > intervals[i - 1], `intervals grow: ${intervals}`);
  const lapse = nextSchedule(s, 0);
  assert.equal(lapse.intervalDays, 1);
  assert.ok(lapse.ease < s.ease);
});

const mk = (skill: string, correct: boolean, difficulty = 2, i = 0, hints = 0) => ({ questionId: `q${i}`, skill, section: "MATH", domain: "ALG", difficulty, correct, hintsUsed: hints, timeMs: 30000, createdAt: new Date(2026, 0, 1, 0, i), mode: "practice", guessed: false });

test("mastery rises with correct answers and falls with misses; hints count less", () => {
  const up = computeSkillStates(Array.from({ length: 10 }, (_, i) => mk("systems", true, 2, i))).get("systems")!;
  const down = computeSkillStates(Array.from({ length: 10 }, (_, i) => mk("systems", false, 2, i))).get("systems")!;
  const hinted = computeSkillStates(Array.from({ length: 10 }, (_, i) => mk("systems", true, 2, i, 2))).get("systems")!;
  assert.ok(up.mastery > 0.8 && down.mastery < 0.2);
  assert.ok(hinted.mastery < up.mastery);
  assert.equal(down.consecutiveMisses, 10);
  assert.equal(targetDifficulty(up.theta), 3);
  assert.equal(targetDifficulty(down.theta), 1);
});

test("score estimate needs data, stays in range, and gets narrower with more data", () => {
  assert.equal(estimateSection(computeSkillStates([]), "MATH"), null);
  const few = estimateSection(computeSkillStates(Array.from({ length: 10 }, (_, i) => mk("systems", i % 2 === 0, 2, i))), "MATH")!;
  const many = estimateSection(computeSkillStates(Array.from({ length: 100 }, (_, i) => mk("systems", i % 2 === 0, 2, i))), "MATH")!;
  assert.ok(few.low >= 200 && few.high <= 800);
  assert.ok(many.high - many.low < few.high - few.low);
  assert.equal(Math.round(proportionToScore(scoreToProportion(600))), 600);
  assert.ok(pCorrect(0, 1) > pCorrect(0, 3));
});

test("recommendations: unpracticed skills first, mastered skills deprioritized", () => {
  const many = Array.from({ length: 12 }, (_, i) => mk("linear-one-var", true, 3, i));
  const recs = recommend(computeSkillStates(many));
  const lov = recs.find((r) => r.skill === "linear-one-var")!;
  assert.equal(lov.action, "maintain");
  assert.ok(recs.indexOf(lov) > 10);
  // Stalled skill → lesson
  const stalled = Array.from({ length: 20 }, (_, i) => mk("systems", i % 2 === 0, 2, i));
  const r2 = recommend(computeSkillStates(stalled)).find((r) => r.skill === "systems")!;
  assert.equal(r2.action, "lesson");
});

test("study plan fits the time budget and handles missed days", () => {
  const recs = recommend(computeSkillStates([]));
  const base = { dueReviews: 40, recs, lessonsDone: new Set<string>(), daysToTest: 90, hasDiagnostic: true, totalAttempts: 100, daysSinceLastStudy: 5, fullTestsTaken: 0, daysSinceFullTest: null, doneToday: { kinds: new Set<string>(), skills: new Set<string>(), lessons: new Set<string>() } };
  for (const M of [15, 30, 60, 120]) {
    const p = buildPlan({ ...base, dailyMinutes: M });
    const total = p.blocks.filter((b) => b.kind !== "fulltest").reduce((t, b) => t + b.minutes, 0);
    assert.ok(total <= M + 6, `plan for ${M} min uses ${total} min`);
    const review = p.blocks.find((b) => b.kind === "review");
    assert.ok(review && review.minutes <= Math.max(5, M * 0.4), "reviews capped even with a big backlog");
  }
  assert.ok(buildPlan({ ...base, dailyMinutes: 30 }).notes.some((n) => /Welcome back/.test(n)));
  const fresh = buildPlan({ ...base, dailyMinutes: 30, hasDiagnostic: false, totalAttempts: 0, dueReviews: 0 });
  assert.equal(fresh.blocks[0].kind, "diagnostic");
});

test("tutor leak guard catches stated answers in hint mode", () => {
  const q = RW_CONVENTIONS[0] as MCQuestion; // answer A
  assert.ok(leaksAnswer(q, "The correct answer is A."));
  assert.ok(leaksAnswer(q, "So the answer is (A)"));
  assert.ok(leaksAnswer(q, "Choice A is correct because..."));
  assert.ok(!leaksAnswer(q, "Think about whether both sides are complete sentences."));
  const m = buildMathQuestions().find((x) => x.type === "mcq" && x.template === "lin1-basic") as MCQuestion;
  const keyed = m.choices["ABCD".indexOf(m.answer)].text;
  assert.ok(leaksAnswer(m, `so the answer is ${keyed}`));
});

test("question validator rejects broken questions", () => {
  const good = RW_CONVENTIONS[0] as MCQuestion;
  assert.deepEqual(validateQuestion(good), []);
  assert.ok(validateQuestion({ ...good, answer: "E" as never }).length > 0, "missing/invalid answer key");
  assert.ok(validateQuestion({ ...good, explanation: "" }).length > 0, "missing explanation");
  const m = buildMathQuestions().find((x) => x.type === "mcq" && x.check) as MCQuestion;
  const wrongKey = "ABCD"[("ABCD".indexOf(m.answer) + 1) % 4] as MCQuestion["answer"];
  assert.ok(validateQuestion({ ...m, answer: wrongKey }).some((p) => /fails independent check/.test(p)), "wrong math key is caught by code");
});

test("every math question's keyed answer passes its independent check", () => {
  for (const q of buildMathQuestions()) assert.deepEqual(validateQuestion(q), [], q.id);
});
