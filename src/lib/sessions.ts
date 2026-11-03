import "server-only";
import { db } from "./db";
import { QUESTIONS, getQuestion } from "@/content/bank";
import type { Question } from "@/content/types";
import { DOMAINS, SAT_FORMAT, skillById, type DomainId } from "@/content/taxonomy";
import { hashString, mulberry32, shuffle, type Rng } from "@/content/math-util";
import { loadStudent } from "./student";
import { recommend } from "./recommend";
import { targetDifficulty, proportionToScore } from "./mastery";
import { grade, suggestMistake } from "./grading";
import { recordReview, dueReviews } from "./srs";

export type SessionKind = "practice" | "review" | "timed" | "diagnostic" | "fulltest";
export const EXAM_KINDS: SessionKind[] = ["timed", "diagnostic", "fulltest"];

export interface ModuleSpec {
  section: "RW" | "MATH";
  index: 1 | 2;
  questionIds: string[];
  timeLimitSec: number;
  level?: "easier" | "harder";
}

export interface SessionConfig {
  kind: SessionKind;
  skill?: string;
  domain?: DomainId;
  section?: "RW" | "MATH";
  count: number;
  /** Seconds for the whole set; null = untimed. */
  timeLimitSec?: number | null;
  questionIds?: string[];
  modules?: ModuleSpec[];
  /** Review sessions: question served → original review item it stands in for. */
  reviewFor?: Record<string, string>;
}

export interface QState {
  response?: string;
  timeMs: number;
  hints: number;
  guessed: boolean;
  marked: boolean;
  eliminated?: string[];
  graded?: { correct: boolean; attemptId: string };
}

export interface SessionState {
  order: string[];
  current: number;
  answers: Record<string, QState>;
  remainingSec?: number | null;
  moduleIdx?: number;
  phase?: "module" | "break" | "done";
  breakRemainingSec?: number;
  /** Practice: true when the student missed twice in a row and should see a lesson. */
  suggestLesson?: string | null;
}

const DAY = 86400000;
const RW_ORDER: DomainId[] = ["CS", "II", "SEC", "EOI"]; // order used by the digital SAT

export const parseConfig = (s: string) => JSON.parse(s) as SessionConfig;
export const parseState = (s: string) => JSON.parse(s) as SessionState;

function matches(q: Question, c: Pick<SessionConfig, "skill" | "domain" | "section">) {
  return (!c.skill || q.skill === c.skill) && (!c.domain || q.domain === c.domain) && (!c.section || q.section === c.section);
}

async function recentlySeen(userId: string, days: number) {
  const rows = await db.attempt.findMany({
    where: { userId, createdAt: { gte: new Date(Date.now() - days * DAY) } },
    select: { questionId: true },
  });
  return new Set(rows.map((r) => r.questionId));
}

async function everSeen(userId: string) {
  const rows = await db.attempt.findMany({ where: { userId }, select: { questionId: true }, distinct: ["questionId"] });
  return new Set(rows.map((r) => r.questionId));
}

/** Pick n questions from a pool, preferring unseen ones, spreading over difficulties as requested. */
function pickBalanced(r: Rng, pool: Question[], n: number, seen: Set<string>, diffWeights: [number, number, number] = [1, 1, 1], exclude = new Set<string>()) {
  const out: Question[] = [];
  const avail = shuffle(r, pool.filter((q) => !exclude.has(q.id)));
  avail.sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
  const total = diffWeights[0] + diffWeights[1] + diffWeights[2];
  const quota = diffWeights.map((w) => Math.round((w / total) * n));
  for (const d of [1, 2, 3] as const) {
    for (const q of avail) {
      if (out.length >= n || quota[d - 1] <= 0) break;
      if (q.difficulty === d && !out.includes(q)) {
        out.push(q);
        quota[d - 1]--;
      }
    }
  }
  for (const q of avail) {
    if (out.length >= n) break;
    if (!out.includes(q)) out.push(q);
  }
  return out;
}

function sortForSection(qs: Question[]) {
  return [...qs].sort((a, b) => {
    if (a.section === "RW" && b.section === "RW") {
      const da = RW_ORDER.indexOf(a.domain), dbi = RW_ORDER.indexOf(b.domain);
      if (da !== dbi) return da - dbi;
      if (a.skill !== b.skill) return a.skill.localeCompare(b.skill);
    }
    return a.difficulty - b.difficulty;
  });
}

/** Build one SAT-format module with domain proportions matching the official blueprint. */
function buildModule(r: Rng, section: "RW" | "MATH", n: number, seen: Set<string>, exclude: Set<string>, level?: "easier" | "harder") {
  const weights: [number, number, number] = level === "harder" ? [0.5, 2, 2.5] : level === "easier" ? [2.5, 2, 0.5] : [1, 1.4, 1];
  const domains = DOMAINS.filter((d) => d.section === section);
  const picked: Question[] = [];
  for (const d of domains) {
    const k = Math.round(d.weight * n);
    picked.push(...pickBalanced(r, QUESTIONS.filter((q) => q.domain === d.id), k, seen, weights, new Set([...exclude, ...picked.map((p) => p.id)])));
  }
  // Fill or trim to exactly n.
  if (picked.length < n) {
    picked.push(...pickBalanced(r, QUESTIONS.filter((q) => q.section === section), n - picked.length, seen, weights, new Set([...exclude, ...picked.map((p) => p.id)])));
  }
  if (picked.length < n) throw new Error(`Not enough verified ${section} questions to build a ${n}-question module (have ${picked.length}).`);
  return sortForSection(picked.slice(0, n));
}

export async function createSession(userId: string, input: Partial<SessionConfig> & { kind: SessionKind }) {
  const r = mulberry32(hashString(userId + Date.now()));
  const seen = await everSeen(userId);
  const config: SessionConfig = { count: 10, ...input };
  let title = "Practice";
  const state: SessionState = { order: [], current: 0, answers: {} };

  if (config.kind === "practice") {
    config.count = Math.min(Math.max(config.count || 10, 3), 30);
    title = config.skill ? `Practice: ${skillById.get(config.skill)?.name}` : config.domain ? `Practice: ${DOMAINS.find((d) => d.id === config.domain)?.name}` : config.section ? `Practice: ${config.section === "RW" ? "Reading and Writing" : "Math"} mix` : "Smart practice";
  } else if (config.kind === "review") {
    const due = await dueReviews(userId, new Date(), 15);
    if (!due.length) throw new UserError("Nothing is due for review right now. Nice work.");
    const ids: string[] = [];
    const reviewFor: Record<string, string> = {};
    const used = new Set<string>();
    const recent = await recentlySeen(userId, 2);
    for (const item of due) {
      const original = getQuestion(item.questionId);
      if (!original) continue;
      // First review after a miss: try a different question on the same skill so the
      // student practices the concept instead of remembering one answer.
      let serve = original;
      if (item.reps === 0) {
        const sibling = shuffle(r, QUESTIONS.filter((q) => q.skill === original.skill && q.id !== original.id && !recent.has(q.id) && !used.has(q.id) && Math.abs(q.difficulty - original.difficulty) <= 1))[0];
        if (sibling) serve = sibling;
      }
      if (used.has(serve.id)) continue;
      used.add(serve.id);
      ids.push(serve.id);
      reviewFor[serve.id] = original.id;
    }
    config.questionIds = ids;
    config.reviewFor = reviewFor;
    config.count = ids.length;
    state.order = ids;
    title = `Review: ${ids.length} question${ids.length === 1 ? "" : "s"}`;
  } else if (config.kind === "timed") {
    const n = Math.min(Math.max(config.count || 10, 1), 54);
    const pool = QUESTIONS.filter((q) => matches(q, config));
    const qs = pickBalanced(r, pool, n, seen);
    if (qs.length < n) throw new UserError(`Only ${qs.length} verified questions match that filter. Try a broader selection or fewer questions.`);
    config.questionIds = sortForSection(qs).map((q) => q.id);
    config.count = n;
    state.order = config.questionIds;
    state.remainingSec = config.timeLimitSec ?? null;
    title = `Timed set: ${n} ${config.skill ? skillById.get(config.skill)?.name : config.domain ? DOMAINS.find((d) => d.id === config.domain)?.name : config.section === "RW" ? "Reading and Writing" : config.section === "MATH" ? "Math" : "mixed"} question${n === 1 ? "" : "s"}`;
  } else if (config.kind === "diagnostic") {
    const ids: string[] = [];
    for (const d of DOMAINS) {
      const pool = QUESTIONS.filter((q) => q.domain === d.id);
      ids.push(...pickBalanced(r, pool, 3, seen, [1, 1, 1], new Set(ids)).map((q) => q.id));
    }
    const rwIds = sortForSection(ids.map((id) => getQuestion(id)!).filter((q) => q.section === "RW")).map((q) => q.id);
    const mIds = sortForSection(ids.map((id) => getQuestion(id)!).filter((q) => q.section === "MATH")).map((q) => q.id);
    config.questionIds = [...rwIds, ...mIds];
    config.count = config.questionIds.length;
    config.timeLimitSec = null;
    state.order = config.questionIds;
    title = "Diagnostic assessment";
  } else if (config.kind === "fulltest") {
    const exclude = new Set<string>();
    const m1 = buildModule(r, "RW", SAT_FORMAT.RW.questionsPerModule, seen, exclude);
    config.modules = [{ section: "RW", index: 1, questionIds: m1.map((q) => q.id), timeLimitSec: SAT_FORMAT.RW.minutesPerModule * 60 }];
    // Make sure module 2 can be built later on both routes; fail now rather than mid-test.
    for (const level of ["easier", "harder"] as const) {
      buildModule(r, "RW", SAT_FORMAT.RW.questionsPerModule, seen, new Set(m1.map((q) => q.id)), level);
    }
    state.order = config.modules[0].questionIds;
    state.moduleIdx = 0;
    state.phase = "module";
    state.remainingSec = config.modules[0].timeLimitSec;
    config.count = 98;
    title = "Full-length practice SAT";
  }

  const s = await db.practiceSession.create({
    data: { userId, kind: config.kind, title, config: JSON.stringify(config), state: JSON.stringify(state) },
  });
  if (config.kind === "practice") await nextPracticeQuestion(userId, s.id);
  return s;
}

export class UserError extends Error {}

/** Choose the next question in a practice session, adapting difficulty to the student's skill rating. */
export async function nextPracticeQuestion(userId: string, sessionId: string) {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: sessionId, userId } });
  const config = parseConfig(s.config);
  const state = parseState(s.state);
  if (state.order.length >= config.count) return null;
  const student = await loadStudent(userId);
  const recent = await recentlySeen(userId, 3);
  const r = mulberry32(hashString(sessionId + state.order.length));

  let skills: string[];
  if (config.skill) skills = [config.skill];
  else {
    // Smart practice interleaves the highest-priority skills (within the chosen domain/section, if any).
    const recs = recommend(student.states).filter((x) => matches({ skill: x.skill, domain: skillById.get(x.skill)!.domain, section: x.section } as Question, config));
    skills = recs.slice(0, 3).map((x) => x.skill);
  }
  const skill = skills[state.order.length % skills.length];
  const st = student.states.get(skill)!;
  let diff = targetDifficulty(st.theta);
  let suggestLesson: string | null = null;
  if (st.consecutiveMisses >= 2) {
    diff = Math.max(1, diff - 1) as 1 | 2 | 3;
    suggestLesson = skill;
  }
  const inSession = new Set(state.order);
  const pool = QUESTIONS.filter((q) => q.skill === skill && !inSession.has(q.id));
  const ranked = shuffle(r, pool).sort((a, b) => {
    const score = (q: Question) => Math.abs(q.difficulty - diff) * 2 + (recent.has(q.id) ? 3 : 0);
    return score(a) - score(b);
  });
  const next = ranked[0] ?? shuffle(r, QUESTIONS.filter((q) => matches(q, config) && !inSession.has(q.id)))[0];
  if (!next) return null;
  state.order.push(next.id);
  state.current = state.order.length - 1;
  state.suggestLesson = suggestLesson;
  await db.practiceSession.update({ where: { id: s.id }, data: { state: JSON.stringify(state) } });
  return next.id;
}

/** Practice/review: grade one answer right away and record it. */
export async function answerImmediate(
  userId: string,
  sessionId: string,
  questionId: string,
  input: { response: string; timeMs: number; guessed: boolean },
) {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: sessionId, userId } });
  if (s.status !== "active") throw new UserError("This session is already finished.");
  const config = parseConfig(s.config);
  if (EXAM_KINDS.includes(config.kind)) throw new UserError("Answers in this mode are graded when you submit.");
  const state = parseState(s.state);
  if (!state.order.includes(questionId)) throw new UserError("That question isn't part of this session.");
  const q = getQuestion(questionId);
  if (!q) throw new UserError("Question not found.");
  const prev = state.answers[questionId];
  if (prev?.graded) throw new UserError("You already answered this question.");
  const timeMs = clampTime(input.timeMs);
  const hints = prev?.hints ?? 0;
  const g = grade(q, input.response);
  const mistake = suggestMistake(q, g, { guessed: input.guessed, timeMs, timed: false });
  const attempt = await db.attempt.create({
    data: {
      userId, questionId, skill: q.skill, domain: q.domain, section: q.section, difficulty: q.difficulty,
      selected: input.response, correct: g.correct, timeMs, hintsUsed: hints, guessed: input.guessed,
      mode: config.kind, sessionId, mistakeCategory: mistake, overTime: timeMs > q.expectedSec * 2000,
    },
  });
  const outcome = { correct: g.correct, hintsUsed: hints, timeMs, expectedSec: q.expectedSec, guessed: input.guessed };
  await recordReview(userId, q.id, q.skill, outcome);
  const original = config.reviewFor?.[q.id];
  if (original && original !== q.id) {
    const oq = getQuestion(original);
    if (oq) await recordReview(userId, oq.id, oq.skill, { ...outcome, expectedSec: oq.expectedSec });
  }
  state.answers[questionId] = { ...(prev ?? { hints: 0, marked: false }), response: input.response, timeMs, guessed: input.guessed, hints, marked: false, graded: { correct: g.correct, attemptId: attempt.id } };
  const done = state.order.length >= config.count && state.order.every((id) => state.answers[id]?.graded);
  await db.practiceSession.update({
    where: { id: s.id },
    data: {
      state: JSON.stringify(state),
      ...(done ? { status: "completed", completedAt: new Date(), result: JSON.stringify(summarize(state, config)) } : {}),
    },
  });
  return { q, grade: g, attempt, mistake, done };
}

export function clampTime(ms: number) {
  return Math.max(0, Math.min(Math.round(ms || 0), 60 * 60 * 1000));
}

export interface SessionResult {
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeMs: number;
  slow: string[];
  bySkill: Record<string, [number, number]>;
  byDomain: Record<string, [number, number]>;
  modules?: { section: string; index: number; level?: string; correct: number; total: number }[];
  sectionScores?: Partial<Record<"RW" | "MATH", { score: number; low: number; high: number }>>;
  routing?: { section: string; m1Accuracy: number; threshold: number; level: string }[];
}

export function summarize(state: SessionState, config: SessionConfig, allIds?: string[]): SessionResult {
  const ids = allIds ?? state.order;
  const res: SessionResult = { total: ids.length, correct: 0, incorrect: 0, skipped: 0, timeMs: 0, slow: [], bySkill: {}, byDomain: {} };
  for (const id of ids) {
    const q = getQuestion(id);
    if (!q) continue;
    const a = state.answers[id];
    const answered = a?.response != null && a.response !== "";
    const correct = !!a?.graded?.correct;
    if (!answered) res.skipped++;
    else if (correct) res.correct++;
    else res.incorrect++;
    res.timeMs += a?.timeMs ?? 0;
    if ((a?.timeMs ?? 0) > q.expectedSec * 1500) res.slow.push(id);
    const sk = (res.bySkill[q.skill] ??= [0, 0]);
    sk[1]++;
    if (correct) sk[0]++;
    const dm = (res.byDomain[q.domain] ??= [0, 0]);
    dm[1]++;
    if (correct) dm[0]++;
  }
  void config;
  return res;
}

/** Autosave for exam modes: responses, marks, eliminations, per-question time, and timer. */
export async function saveExamState(
  userId: string,
  sessionId: string,
  patch: { answers: Record<string, Partial<QState>>; current: number; remainingSec?: number | null; breakRemainingSec?: number },
) {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: sessionId, userId } });
  if (s.status !== "active") throw new UserError("This session is already finished.");
  const config = parseConfig(s.config);
  if (!EXAM_KINDS.includes(config.kind)) throw new UserError("Not an exam session.");
  const state = parseState(s.state);
  for (const [qid, a] of Object.entries(patch.answers ?? {})) {
    if (!state.order.includes(qid)) continue;
    const prev = state.answers[qid] ?? { timeMs: 0, hints: 0, guessed: false, marked: false };
    state.answers[qid] = {
      ...prev,
      response: typeof a.response === "string" ? a.response.slice(0, 20) : prev.response,
      marked: a.marked ?? prev.marked,
      guessed: a.guessed ?? prev.guessed,
      eliminated: Array.isArray(a.eliminated) ? a.eliminated.filter((x) => "ABCD".includes(x)).slice(0, 4) : prev.eliminated,
      timeMs: a.timeMs != null ? clampTime(a.timeMs) : prev.timeMs,
    };
  }
  state.current = Math.max(0, Math.min(patch.current ?? state.current, state.order.length - 1));
  // The timer can only go down; a client can't add time back.
  if (patch.remainingSec != null && state.remainingSec != null) state.remainingSec = Math.max(0, Math.min(state.remainingSec, Math.floor(patch.remainingSec)));
  if (patch.breakRemainingSec != null && state.breakRemainingSec != null) state.breakRemainingSec = Math.max(0, Math.min(state.breakRemainingSec, Math.floor(patch.breakRemainingSec)));
  await db.practiceSession.update({ where: { id: s.id }, data: { state: JSON.stringify(state) } });
  return state;
}

// Routing rule used by this simulator: 60% or more correct on module 1 → harder module 2.
// College Board does not publish its routing thresholds; this value is our approximation.
export const ROUTING_THRESHOLD = 0.6;

async function gradeIds(userId: string, sessionId: string, kind: SessionKind, state: SessionState, ids: string[], ranOutOfTime: boolean) {
  for (const id of ids) {
    const q = getQuestion(id);
    if (!q) continue;
    const a = state.answers[id] ?? { timeMs: 0, hints: 0, guessed: false, marked: false };
    if (a.graded) continue;
    const answered = a.response != null && a.response !== "";
    const g = grade(q, a.response);
    // Skipped questions count as incorrect for scoring but are only logged as attempts if the
    // student actually saw them (time > 0), so unseen questions don't distort skill ratings.
    if (!answered && a.timeMs < 1000) {
      state.answers[id] = { ...a, graded: { correct: false, attemptId: "" } };
      continue;
    }
    const mistake = suggestMistake(q, g, { guessed: a.guessed, timeMs: a.timeMs, timed: kind !== "diagnostic", ranOutOfTime: ranOutOfTime && !answered });
    const attempt = await db.attempt.create({
      data: {
        userId, questionId: id, skill: q.skill, domain: q.domain, section: q.section, difficulty: q.difficulty,
        selected: a.response ?? null, correct: g.correct, timeMs: a.timeMs, hintsUsed: 0, guessed: a.guessed,
        mode: kind, sessionId, mistakeCategory: mistake, overTime: a.timeMs > q.expectedSec * 2000,
      },
    });
    await recordReview(userId, id, q.skill, { correct: g.correct, hintsUsed: 0, timeMs: a.timeMs, expectedSec: q.expectedSec, guessed: a.guessed });
    state.answers[id] = { ...a, graded: { correct: g.correct, attemptId: attempt.id } };
  }
}

/** Submit an exam-mode set (or the current module of a full test). */
export async function submitExam(userId: string, sessionId: string, opts: { ranOutOfTime?: boolean } = {}) {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: sessionId, userId } });
  if (s.status !== "active") throw new UserError("This session is already finished.");
  const config = parseConfig(s.config);
  if (!EXAM_KINDS.includes(config.kind)) throw new UserError("Not an exam session.");
  const state = parseState(s.state);
  if (state.phase === "break") throw new UserError("Finish the break first.");

  await gradeIds(userId, s.id, config.kind, state, state.order, !!opts.ranOutOfTime);

  if (config.kind !== "fulltest") {
    const result = summarize(state, config);
    await db.practiceSession.update({ where: { id: s.id }, data: { state: JSON.stringify(state), status: "completed", completedAt: new Date(), result: JSON.stringify(result) } });
    return { done: true };
  }

  // Full test: advance to the next module.
  const modules = config.modules!;
  const mi = state.moduleIdx ?? 0;
  const cur = modules[mi];
  const r = mulberry32(hashString(s.id + mi));
  const seen = await everSeen(userId);
  const used = new Set(modules.flatMap((m) => m.questionIds));
  if (cur.index === 1) {
    const acc = cur.questionIds.filter((id) => state.answers[id]?.graded?.correct).length / cur.questionIds.length;
    const level = acc >= ROUTING_THRESHOLD ? "harder" : "easier";
    const fmt = SAT_FORMAT[cur.section];
    const m2 = buildModule(r, cur.section, fmt.questionsPerModule, seen, used, level);
    modules.push({ section: cur.section, index: 2, questionIds: m2.map((q) => q.id), timeLimitSec: fmt.minutesPerModule * 60, level });
  } else if (cur.section === "RW") {
    const m1 = buildModule(r, "MATH", SAT_FORMAT.MATH.questionsPerModule, seen, used);
    modules.push({ section: "MATH", index: 1, questionIds: m1.map((q) => q.id), timeLimitSec: SAT_FORMAT.MATH.minutesPerModule * 60 });
    state.phase = "break";
    state.breakRemainingSec = SAT_FORMAT.breakMinutes * 60;
  } else {
    const all = modules.flatMap((m) => m.questionIds);
    const result = summarize(state, config, all);
    result.modules = modules.map((m) => ({ section: m.section, index: m.index, level: m.level, total: m.questionIds.length, correct: m.questionIds.filter((id) => state.answers[id]?.graded?.correct).length }));
    result.routing = (["RW", "MATH"] as const).map((sec) => {
      const m1 = result.modules!.find((m) => m.section === sec && m.index === 1)!;
      const m2 = result.modules!.find((m) => m.section === sec && m.index === 2)!;
      return { section: sec, m1Accuracy: m1.correct / m1.total, threshold: ROUTING_THRESHOLD, level: m2.level ?? "" };
    });
    result.sectionScores = {};
    for (const sec of ["RW", "MATH"] as const) {
      const m1 = result.modules.find((m) => m.section === sec && m.index === 1)!;
      const m2 = result.modules.find((m) => m.section === sec && m.index === 2)!;
      // Questions on the easier second module count for less, so the same raw score
      // routes to a lower scale score (as on the real test, the easier route caps the score).
      const factor = m2.level === "harder" ? 1 : 0.78;
      const p = (m1.correct + m2.correct * factor) / (m1.total + m2.total);
      const score = Math.round(proportionToScore(p) / 10) * 10;
      result.sectionScores[sec] = { score, low: Math.max(200, score - 60), high: Math.min(800, score + 60) };
    }
    state.phase = "done";
    await db.practiceSession.update({ where: { id: s.id }, data: { config: JSON.stringify(config), state: JSON.stringify(state), status: "completed", completedAt: new Date(), result: JSON.stringify(result) } });
    return { done: true };
  }
  const next = modules[modules.length - 1];
  state.moduleIdx = modules.length - 1;
  state.order = next.questionIds;
  state.current = 0;
  state.remainingSec = next.timeLimitSec;
  if (state.phase !== "break") state.phase = "module";
  await db.practiceSession.update({ where: { id: s.id }, data: { config: JSON.stringify(config), state: JSON.stringify(state) } });
  return { done: false };
}

export async function endBreak(userId: string, sessionId: string) {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: sessionId, userId } });
  const state = parseState(s.state);
  if (state.phase !== "break") return;
  state.phase = "module";
  state.breakRemainingSec = 0;
  await db.practiceSession.update({ where: { id: s.id }, data: { state: JSON.stringify(state) } });
}

/** Practice/review: finish early. */
export async function finishPractice(userId: string, sessionId: string) {
  const s = await db.practiceSession.findFirstOrThrow({ where: { id: sessionId, userId } });
  if (s.status !== "active") return;
  const config = parseConfig(s.config);
  const state = parseState(s.state);
  // A question that was on screen but never answered when the student ended the session
  // wasn't attempted, so it's dropped from the review instead of shown as a blank row.
  state.order = state.order.filter((id) => state.answers[id]?.graded);
  await db.practiceSession.update({
    where: { id: s.id },
    data: { status: "completed", completedAt: new Date(), state: JSON.stringify(state), result: JSON.stringify(summarize(state, config)) },
  });
}
