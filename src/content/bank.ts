import "server-only";
import type { PublicQuestion, Question } from "./types";
import { buildMathQuestions } from "./math-templates";
import { MATH_WRITTEN } from "./math-written";
import { RW_INFO_IDEAS } from "./rw-info-ideas";
import { RW_CRAFT } from "./rw-craft";
import { RW_EXPRESSION } from "./rw-expression";
import { RW_CONVENTIONS } from "./rw-conventions";
import { RW_MORE } from "./rw-more";
import { validateQuestion, type ValidationIssue } from "./validate";

function build() {
  const all: Question[] = [
    ...RW_INFO_IDEAS, ...RW_CRAFT, ...RW_EXPRESSION, ...RW_CONVENTIONS, ...RW_MORE,
    ...buildMathQuestions(), ...MATH_WRITTEN,
  ];
  const active: Question[] = [];
  const rejected: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const q of all) {
    const problems = validateQuestion(q);
    if (ids.has(q.id)) problems.push("duplicate id");
    ids.add(q.id);
    if (problems.length) {
      rejected.push(...problems.map((problem) => ({ id: q.id, problem })));
      continue;
    }
    active.push(q);
  }
  if (rejected.length && process.env.NODE_ENV !== "test") {
    console.warn(`[question-bank] ${rejected.length} problem(s); affected questions excluded:`, rejected);
  }
  return { active, rejected };
}

const built = build();

export const QUESTIONS: Question[] = built.active;
export const REJECTED: ValidationIssue[] = built.rejected;
export const questionById = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string) {
  return questionById.get(id);
}

/** Strip answer keys, rationales, hints, and explanations before sending to the browser. */
export function toPublic(q: Question): PublicQuestion {
  return {
    id: q.id, type: q.type, section: q.section, domain: q.domain, skill: q.skill, difficulty: q.difficulty,
    expectedSec: q.expectedSec, passage: q.passage, passage2: q.passage2, table: q.table, stem: q.stem,
    verification: q.verification, template: q.template,
    choices: q.type === "mcq" ? q.choices.map((c) => ({ text: c.text })) : undefined,
  };
}
