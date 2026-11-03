import type { Question } from "./types";
import { LETTERS } from "./types";
import { skillById } from "./taxonomy";
import { approx, fmt } from "./math-util";

export interface ValidationIssue {
  id: string;
  problem: string;
}

/**
 * Quality gate for the active question bank. A question that fails any rule is
 * excluded from practice, tests, and the tutor.
 */
export function validateQuestion(q: Question): string[] {
  const p: string[] = [];
  const skill = skillById.get(q.skill);
  if (!skill) p.push(`unknown skill ${q.skill}`);
  else if (skill.domain !== q.domain) p.push(`skill ${q.skill} is not in domain ${q.domain}`);
  if (![1, 2, 3].includes(q.difficulty)) p.push("difficulty must be 1–3");
  if (!(q.expectedSec > 0 && q.expectedSec < 600)) p.push("expectedSec out of range");
  if (!q.stem?.trim()) p.push("missing stem");
  if (!q.explanation?.trim()) p.push("missing explanation");
  if (!q.takeaway?.trim()) p.push("missing takeaway");
  if (q.hints?.length !== 3 || q.hints.some((h) => !h?.trim())) p.push("needs exactly 3 non-empty hints");
  if (q.passage && q.passage.includes(q.stem)) p.push("passage repeats the question stem");

  if (q.type === "mcq") {
    if (q.choices.length !== 4) p.push("needs 4 choices");
    if (!LETTERS.includes(q.answer)) p.push("answer key missing or invalid");
    if (new Set(q.choices.map((c) => c.text.trim())).size !== 4) p.push("duplicate choice text");
    q.choices.forEach((c, i) => {
      if (!c.text.trim()) p.push(`choice ${LETTERS[i]} empty`);
      if (!c.rationale?.trim()) p.push(`choice ${LETTERS[i]} has no rationale`);
    });
    const ai = LETTERS.indexOf(q.answer);
    if (q.section === "MATH" && q.check) {
      if (!q.numericChoices) p.push("math check present but numericChoices missing");
      else {
        q.numericChoices.forEach((v, i) => {
          const ok = q.check!(v);
          if (i === ai && !ok) p.push(`keyed answer ${q.answer} fails independent check`);
          if (i !== ai && ok) p.push(`distractor ${LETTERS[i]} also passes the check (two correct answers)`);
        });
      }
    }
    // Hints must not give away the keyed choice text for short (numeric/expression) answers.
    const keyed = q.choices[ai]?.text ?? "";
    if (q.section === "MATH" && keyed.length <= 12) {
      q.hints.forEach((h, i) => {
        if (new RegExp(`(^|[^\\d.])${escapeRe(keyed)}([^\\d./]|$)`).test(h) && i < 2) p.push(`hint ${i + 1} reveals the answer`);
      });
    }
  } else {
    if (!q.accepted?.length) p.push("SPR answer key missing");
    if (q.check) {
      for (const a of q.accepted) if (!q.check(a)) p.push(`accepted answer ${a} fails independent check`);
      for (const t of q.traps ?? []) if (q.check(t.value)) p.push(`trap value ${t.value} passes the check`);
    }
    if (q.accepted?.length && !approx(Number(eval0(q.answerDisplay)), q.accepted[0])) p.push("answerDisplay doesn't match accepted value");
    q.hints.forEach((h, i) => {
      if (i < 2 && q.accepted?.length && new RegExp(`(^|[^\\d.])${escapeRe(fmt(q.accepted[0]))}([^\\d./]|$)`).test(h) && Math.abs(q.accepted[0]) > 9)
        p.push(`hint ${i + 1} reveals the answer`);
    });
  }
  if (q.section === "MATH" && q.verification === "computed" && !q.check) p.push("marked computed without a check function");
  return p;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function eval0(display: string) {
  const s = display.replace("−", "-");
  const f = s.match(/^(-?\d+)\/(\d+)$/);
  return f ? Number(f[1]) / Number(f[2]) : Number(s);
}
