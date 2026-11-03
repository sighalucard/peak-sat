import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Question } from "@/content/types";
import { domainName, sectionName, skillName } from "@/content/taxonomy";
import { lessonById } from "@/content/lessons";

// Haiku is the lowest-cost current model. It has no server-side fallback, so none is requested.
export const TUTOR_MODEL = "claude-haiku-5-5";

export function tutorConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
export function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

// Stable instructions first so they can be cached across requests.
export const TUTOR_SYSTEM = `You are an SAT tutor inside a digital SAT practice platform. You help high school students understand Reading and Writing and Math questions in the style of the current digital SAT.

Accuracy rules (these override everything else):
- When a verified answer key is provided, it is the source of truth. Never say a different answer is correct, and never agree with a student who claims otherwise. If you think the key might be wrong, say you aren't sure and suggest the student report the question, but still explain the keyed answer's reasoning.
- For Reading and Writing, base every claim on the passage text or a named grammar rule. Quote the passage when you cite evidence.
- For Math, show each step and check arithmetic before stating results. If a step is uncertain, say so.
- Do not invent College Board rules, official score conversions, scoring curves, or statistics. If asked about official scoring, say that College Board doesn't publish its exact scoring model and that this app's estimates are unofficial.
- If you don't know or can't verify something, say so plainly instead of guessing.

Teaching style:
- Be concise and warm. Plain language first, then precise terms. Use short paragraphs or numbered steps.
- Don't assume knowledge the student hasn't shown. Define terms the first time you use them.
- Point out the pattern so the student can recognize similar questions, and mention a faster method when there is one (including Desmos when it's genuinely faster, but not when mental math or algebra is quicker).
- You can't create new verified practice questions. If the student asks for another question like this one, tell them to use the "Similar question" button, which pulls a verified question on the same skill.
- Format math with plain text and Unicode (x², √, π, ≤). Don't use LaTeX.`;

export const PRE_ANSWER_RULES = `The student has NOT answered this question yet. You are in hint mode:
- Do not reveal the correct answer, its letter, its value, or its text, even if asked directly or told it is for checking.
- Do not eliminate choices down to one. You may help the student think about how to evaluate choices in general.
- Give guidance one step at a time: point to the relevant concept, the part of the passage to reread, or the next algebra step without completing the final step.
- If the student asks you to just tell them the answer, encourage them to try, and remind them that they can submit an answer to see the full explanation.`;

export function questionContext(q: Question, opts: { answered: boolean; response?: string | null; correct?: boolean }) {
  const lines: string[] = [];
  lines.push(`Section: ${sectionName(q.section)} | Domain: ${domainName(q.domain)} | Skill: ${skillName(q.skill)} | Difficulty: ${["", "easy", "medium", "hard"][q.difficulty]}`);
  if (q.passage) lines.push(`Passage:\n${q.passage}`);
  if (q.passage2) lines.push(`Second passage:\n${q.passage2}`);
  if (q.table) lines.push(`Table${q.table.caption ? ` (${q.table.caption})` : ""}:\n${[q.table.headers.join(" | "), ...q.table.rows.map((r) => r.join(" | "))].join("\n")}`);
  lines.push(`Question: ${q.stem}`);
  if (q.type === "mcq") lines.push(`Choices:\n${q.choices.map((c, i) => `${"ABCD"[i]}) ${c.text}`).join("\n")}`);
  else lines.push("This is a student-produced response question (the student types a number).");

  lines.push("");
  lines.push("VERIFIED ANSWER KEY (confidential until the student answers):");
  if (q.type === "mcq") {
    lines.push(`Correct answer: ${q.answer}`);
    q.choices.forEach((c, i) => lines.push(`${"ABCD"[i]}: ${c.rationale}`));
  } else {
    lines.push(`Correct answer: ${q.answerDisplay}`);
    for (const t of q.traps ?? []) lines.push(`Common wrong answer ${t.value}: ${t.rationale}`);
  }
  lines.push(`Worked explanation:\n${q.explanation}`);
  lines.push(`Key takeaway: ${q.takeaway}`);
  const lesson = lessonById.get(q.skill);
  if (lesson) lines.push(`Concept notes for this skill: ${lesson.idea} Steps: ${lesson.steps.join(" ")} Common traps: ${lesson.traps.join("; ")}.`);
  lines.push("");
  if (!opts.answered) {
    lines.push(PRE_ANSWER_RULES);
  } else {
    lines.push(`The student answered: ${opts.response ?? "(no answer)"}, which is ${opts.correct ? "CORRECT" : "INCORRECT"}.`);
    lines.push(opts.correct
      ? "Help them consolidate: why it's correct, what concept it tests, how to recognize similar questions, and any faster method."
      : "Help them learn from it: why their answer is wrong, why the key is right, the likely misunderstanding (ask if unsure, since you can't see their thinking), and how to avoid it next time.");
  }
  return lines.join("\n");
}

/**
 * Last-line guard for hint mode: catch replies that state the answer outright.
 * The system prompt is the main control; this check exists because prompts can fail.
 */
export function leaksAnswer(q: Question, text: string) {
  const t = text.replace(/\*\*/g, "");
  if (q.type === "mcq") {
    const L = q.answer;
    const patterns = [
      new RegExp(`\\b(answer|correct (choice|option|answer)|right (choice|answer))\\s*(is|would be|=|:)\\s*\\(?${L}\\b`, "i"),
      new RegExp(`\\b(choice|option)\\s*\\(?${L}\\)?\\s*is\\s*(correct|right|the answer)`, "i"),
      new RegExp(`^\\s*\\(?${L}\\)?[.:]?\\s*$`, "m"),
    ];
    if (patterns.some((p) => p.test(t))) return true;
    const keyed = q.choices["ABCD".indexOf(L)].text;
    if (q.section === "MATH" && new RegExp(`(answer|result|value|equals|=)\\s*(is\\s*)?${escapeRe(keyed)}(?![\\d/.])`, "i").test(t)) return true;
  } else {
    const a = escapeRe(q.answerDisplay);
    if (new RegExp(`(answer|x|value|solution)\\s*(is|=|equals)\\s*${a}(?![\\d/.])`, "i").test(t)) return true;
  }
  return false;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const TUTOR_UNAVAILABLE =
  "The AI tutor isn't available right now because no AI API key is configured on the server. Hints, worked explanations, and lessons all still work.";
