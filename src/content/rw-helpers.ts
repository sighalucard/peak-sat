import type { Choice, Difficulty, Letter, MCQuestion } from "./types";
import { skillById, type MistakeCategory } from "./taxonomy";

type C = [text: string, rationale: string, trap?: MistakeCategory];

export interface RWSpec {
  id: string;
  skill: string;
  difficulty: Difficulty;
  sec?: number;
  passage?: string;
  passage2?: string;
  table?: MCQuestion["table"];
  stem: string;
  choices: [C, C, C, C];
  answer: Letter;
  hints: [string, string, string];
  explanation: string;
  takeaway: string;
}

const DEFAULT_SEC: Record<number, number> = { 1: 60, 2: 75, 3: 90 };

/** Build a reviewed Reading & Writing multiple-choice question. */
export function rw(s: RWSpec): MCQuestion {
  const skill = skillById.get(s.skill);
  if (!skill) throw new Error(`Unknown skill ${s.skill} in ${s.id}`);
  return {
    id: s.id,
    type: "mcq",
    section: "RW",
    domain: skill.domain,
    skill: s.skill,
    difficulty: s.difficulty,
    expectedSec: s.sec ?? DEFAULT_SEC[s.difficulty],
    passage: s.passage,
    passage2: s.passage2,
    table: s.table,
    stem: s.stem,
    choices: s.choices.map(([text, rationale, trap]) => ({ text, rationale, trap })) as [Choice, Choice, Choice, Choice],
    answer: s.answer,
    hints: s.hints,
    explanation: s.explanation,
    takeaway: s.takeaway,
    verification: "reviewed",
  };
}
