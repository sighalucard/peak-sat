import type { Question } from "@/content/types";
import { LETTERS } from "@/content/types";
import { approx, gradeSPR, parseSPR } from "@/content/math-util";
import type { MistakeCategory } from "@/content/taxonomy";

export interface GradeResult {
  correct: boolean;
  /** The specific trap the response matched, if any. */
  trap?: MistakeCategory;
  trapRationale?: string;
}

export function grade(q: Question, response: string | null | undefined): GradeResult {
  if (response == null || response === "") return { correct: false };
  if (q.type === "mcq") {
    const letter = response.toUpperCase();
    const idx = LETTERS.indexOf(letter as (typeof LETTERS)[number]);
    if (idx < 0) return { correct: false };
    if (letter === q.answer) return { correct: true };
    return { correct: false, trap: q.choices[idx].trap, trapRationale: q.choices[idx].rationale };
  }
  if (gradeSPR(response, q.accepted)) return { correct: true };
  const v = parseSPR(response);
  const t = v === null ? undefined : q.traps?.find((t) => approx(t.value, v));
  return { correct: false, trap: t?.trap, trapRationale: t?.rationale };
}

/**
 * Suggest a mistake category. This is a starting guess the student can change,
 * since we can't know their actual thought process.
 */
export function suggestMistake(
  q: Question,
  g: GradeResult,
  ctx: { guessed: boolean; timeMs: number; timed: boolean; ranOutOfTime?: boolean },
): MistakeCategory | null {
  if (g.correct) return null;
  if (ctx.guessed) return "guess";
  if (ctx.ranOutOfTime) return "time";
  if (g.trap) return g.trap;
  if (ctx.timed && ctx.timeMs > q.expectedSec * 2000) return "time";
  if (ctx.timeMs < q.expectedSec * 300) return "misread";
  if (q.section === "MATH") return "concept";
  return q.domain === "SEC" ? "grammar" : "evidence";
}

export function answerDisplay(q: Question) {
  return q.type === "mcq" ? q.answer : q.answerDisplay;
}
