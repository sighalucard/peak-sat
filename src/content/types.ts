import type { DomainId, MistakeCategory, Section } from "./taxonomy";

export type Difficulty = 1 | 2 | 3; // 1 easy, 2 medium, 3 hard
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

export type Letter = "A" | "B" | "C" | "D";
export const LETTERS: Letter[] = ["A", "B", "C", "D"];

export interface Choice {
  text: string;
  /** Why this choice is right or wrong. Required for every choice. */
  rationale: string;
  /** For wrong choices: the mistake this trap usually reflects. */
  trap?: MistakeCategory;
}

interface QuestionBase {
  id: string;
  section: Section;
  domain: DomainId;
  skill: string;
  difficulty: Difficulty;
  /** Expected solving time in seconds for a prepared student. */
  expectedSec: number;
  passage?: string;
  /** Second passage for cross-text questions. */
  passage2?: string;
  /** Optional simple data table rendered with the question. */
  table?: { headers: string[]; rows: (string | number)[][]; caption?: string };
  stem: string;
  /** Progressive hints: [subtle, strategy, guided]. Never state the answer. */
  hints: [string, string, string];
  /** Full worked explanation shown after submission. */
  explanation: string;
  /** Concept recognition / pattern tip. */
  takeaway: string;
  /** How the answer key was verified. */
  verification: "computed" | "reviewed";
  /** Template id when generated from a math template. */
  template?: string;
  /**
   * Independent programmatic check for math: returns true only for a correct value.
   * Used by the validator, which also confirms every distractor fails it.
   */
  check?: (value: number) => boolean;
}

export interface MCQuestion extends QuestionBase {
  type: "mcq";
  choices: [Choice, Choice, Choice, Choice];
  answer: Letter;
  /** Numeric value of each choice (math), so the validator can run `check` on all four. */
  numericChoices?: [number, number, number, number];
}

export interface SPRQuestion extends QuestionBase {
  type: "spr";
  /** Accepted numeric answers (student-produced response). */
  accepted: number[];
  /** Canonical display of the answer, e.g. "3/4". */
  answerDisplay: string;
  /** Common wrong numeric answers and what they suggest. */
  traps?: { value: number; rationale: string; trap: MistakeCategory }[];
}

export type Question = MCQuestion | SPRQuestion;

/** Data safe to send to the browser before the student submits. */
export type PublicQuestion = Omit<
  Question,
  "answer" | "accepted" | "answerDisplay" | "explanation" | "takeaway" | "hints" | "traps" | "choices" | "check" | "numericChoices"
> & {
  choices?: { text: string }[];
};
