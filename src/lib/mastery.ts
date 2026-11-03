// Skill mastery model. A simple logistic (Elo-style) rating per skill, updated from
// every attempt in order. This is a heuristic for choosing practice difficulty and
// prioritizing study. It is not a calibrated psychometric (IRT) model.

import { SKILLS, skillById, skillTestWeight } from "@/content/taxonomy";

export interface AttemptLite {
  questionId: string;
  skill: string;
  section: string;
  domain: string;
  difficulty: number;
  correct: boolean;
  hintsUsed: number;
  timeMs: number;
  createdAt: Date;
  mode: string;
  guessed: boolean;
  mistakeCategory?: string | null;
  overTime?: boolean;
}

const DIFF_B: Record<number, number> = { 1: -1, 2: 0, 3: 1 };
const SLOPE = 1.2;

export const pCorrect = (theta: number, difficulty: number) => 1 / (1 + Math.exp(-SLOPE * (theta - DIFF_B[difficulty])));

export interface SkillState {
  skill: string;
  theta: number;
  n: number;
  correct: number;
  hinted: number;
  totalMs: number;
  /** P(correct) on a medium question: our mastery number, 0–1. */
  mastery: number;
  /** Mastery 10 attempts ago (or first value), to measure trend. */
  masteryEarlier: number | null;
  recent: boolean[];
  lastAt: Date | null;
  consecutiveMisses: number;
}

function emptyState(skill: string, prior = 0): SkillState {
  return { skill, theta: prior, n: 0, correct: 0, hinted: 0, totalMs: 0, mastery: pCorrect(prior, 2), masteryEarlier: null, recent: [], lastAt: null, consecutiveMisses: 0 };
}

/**
 * Replay attempts chronologically into per-skill ratings.
 * A correct answer that used hints counts as half credit, because the hint did some of the work.
 */
export function computeSkillStates(attempts: AttemptLite[], priors: Partial<Record<"RW" | "MATH", number>> = {}) {
  const states = new Map<string, SkillState>();
  for (const s of SKILLS) states.set(s.id, emptyState(s.id, priorFor(s.id, priors)));
  const sorted = [...attempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const history = new Map<string, number[]>();
  for (const a of sorted) {
    const st = states.get(a.skill);
    if (!st) continue;
    const outcome = a.correct ? (a.hintsUsed > 0 || a.guessed ? 0.5 : 1) : 0;
    const k = 0.7 / Math.sqrt(1 + st.n / 4);
    st.theta += k * (outcome - pCorrect(st.theta, a.difficulty));
    st.theta = Math.max(-3, Math.min(3, st.theta));
    st.n++;
    if (a.correct) st.correct++;
    if (a.hintsUsed > 0) st.hinted++;
    st.totalMs += a.timeMs;
    st.recent.push(a.correct);
    if (st.recent.length > 10) st.recent.shift();
    st.lastAt = a.createdAt;
    st.consecutiveMisses = a.correct ? 0 : st.consecutiveMisses + 1;
    st.mastery = pCorrect(st.theta, 2);
    const h = history.get(a.skill) ?? [];
    h.push(st.mastery);
    history.set(a.skill, h);
  }
  for (const [skill, h] of history) {
    const st = states.get(skill)!;
    st.masteryEarlier = h.length > 10 ? h[h.length - 11] : h.length > 1 ? h[0] : null;
  }
  return states;
}

function priorFor(skillId: string, priors: Partial<Record<"RW" | "MATH", number>>) {
  const sec = skillById.get(skillId)?.domain;
  if (!sec) return 0;
  const section = ["II", "CS", "EOI", "SEC"].includes(sec) ? "RW" : "MATH";
  return priors[section] ?? 0;
}

/**
 * Convert a self-reported section score into a starting rating, so a student who says
 * they score 700 isn't started on the easiest questions. Pure heuristic.
 */
export function priorFromScore(sectionScore: number | null | undefined) {
  if (!sectionScore) return 0;
  const p = scoreToProportion(sectionScore);
  // Solve pCorrect(theta, medium) = p
  const clamped = Math.min(0.95, Math.max(0.05, p));
  return Math.log(clamped / (1 - clamped)) / SLOPE;
}

/** Choose the difficulty with expected success closest to the target (default 70%). */
export function targetDifficulty(theta: number, target = 0.7): 1 | 2 | 3 {
  let best: 1 | 2 | 3 = 2;
  let bestGap = Infinity;
  for (const d of [1, 2, 3] as const) {
    const gap = Math.abs(pCorrect(theta, d) - target);
    if (gap < bestGap) [best, bestGap] = [d, gap];
  }
  return best;
}

// ─── Score estimation (unofficial) ───

// Rough mapping from proportion of a typical test answered correctly to a 200–800
// section score. These anchor points are approximations based on publicly discussed
// practice-test score tables, not College Board's scoring model.
const ANCHORS: [number, number][] = [[0, 200], [0.15, 300], [0.3, 400], [0.5, 510], [0.65, 590], [0.8, 680], [0.9, 740], [1, 800]];

export function proportionToScore(p: number) {
  p = Math.max(0, Math.min(1, p));
  for (let i = 1; i < ANCHORS.length; i++) {
    const [p1, s1] = ANCHORS[i];
    const [p0, s0] = ANCHORS[i - 1];
    if (p <= p1) return s0 + ((p - p0) / (p1 - p0)) * (s1 - s0);
  }
  return 800;
}

export function scoreToProportion(score: number) {
  score = Math.max(200, Math.min(800, score));
  for (let i = 1; i < ANCHORS.length; i++) {
    const [p1, s1] = ANCHORS[i];
    const [p0, s0] = ANCHORS[i - 1];
    if (score <= s1) return p0 + ((score - s0) / (s1 - s0)) * (p1 - p0);
  }
  return 1;
}

export interface SectionEstimate {
  section: "RW" | "MATH";
  low: number;
  high: number;
  mid: number;
  n: number;
}

const round10 = (x: number) => Math.round(x / 10) * 10;

/**
 * Estimate a section score range from skill ratings. Returns null when there are too
 * few attempts in that section to say anything useful.
 */
export function estimateSection(states: Map<string, SkillState>, section: "RW" | "MATH"): SectionEstimate | null {
  const skills = SKILLS.filter((s) => (["II", "CS", "EOI", "SEC"].includes(s.domain) ? "RW" : "MATH") === section);
  const n = skills.reduce((t, s) => t + (states.get(s.id)?.n ?? 0), 0);
  if (n < 8) return null;
  let p = 0, w = 0;
  for (const s of skills) {
    const st = states.get(s.id)!;
    const weight = skillTestWeight(s.id);
    // A real test mixes difficulties; average over easy/medium/hard.
    const ps = (pCorrect(st.theta, 1) + pCorrect(st.theta, 2) + pCorrect(st.theta, 3)) / 3;
    p += ps * weight;
    w += weight;
  }
  const mid = proportionToScore(p / w);
  const half = 40 + 180 / Math.sqrt(1 + n / 4);
  return { section, mid: round10(mid), low: Math.max(200, round10(mid - half)), high: Math.min(800, round10(mid + half)), n };
}
