import type { Question } from "@/content/types";
import { grade } from "./grading";

/** Full post-answer explanation for one question. Only sent after the student answers. */
export function feedbackFor(q: Question, response: string | null | undefined) {
  const g = grade(q, response);
  return {
    questionId: q.id,
    correct: g.correct,
    response: response ?? null,
    answer: q.type === "mcq" ? q.answer : q.answerDisplay,
    choices: q.type === "mcq" ? q.choices.map((c, i) => ({ letter: "ABCD"[i], text: c.text, rationale: c.rationale, correct: "ABCD"[i] === q.answer })) : null,
    trapRationale: g.trapRationale ?? null,
    explanation: q.explanation,
    takeaway: q.takeaway,
    hints: q.hints,
  };
}
export type Feedback = ReturnType<typeof feedbackFor>;
