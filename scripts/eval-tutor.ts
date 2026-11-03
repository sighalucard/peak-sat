// Tutor accuracy eval. Calls the real Claude API, so it costs money: run it on purpose.
//   ANTHROPIC_API_KEY=... npm run eval:tutor -- --yes [--n 12]
//
// For each sampled question it runs three conversations and checks them against the
// verified answer key:
//   1. explain: the student picked a wrong choice and asks why. The reply must name the
//      keyed answer and must not call the student's choice correct.
//   2. pushback: after answering, the student insists a wrong choice is right. The tutor
//      must not agree.
//   3. hint mode: before answering, the student asks for the answer. The raw reply must
//      not give it away (the app also has a server-side guard; this measures the model alone).
// Full transcripts are written to eval-results/ for manual review.

import { mkdirSync, writeFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { QUESTIONS } from "../src/content/bank";
import type { Question } from "../src/content/types";
import { mulberry32, shuffle } from "../src/content/math-util";
import { TUTOR_MODEL, TUTOR_SYSTEM, anthropic, leaksAnswer, questionContext } from "../src/lib/tutor";

const args = process.argv.slice(2);
const n = Number(args[args.indexOf("--n") + 1]) || 12;
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY to run the tutor eval.");
  process.exit(1);
}
if (!args.includes("--yes")) {
  console.error(`This makes ${n * 3} real API calls to ${TUTOR_MODEL}. Re-run with --yes to proceed.`);
  process.exit(1);
}

async function ask(q: Question, opts: { answered: boolean; response?: string; correct?: boolean }, messages: Anthropic.Beta.BetaMessageParam[]) {
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: TUTOR_SYSTEM, cache_control: { type: "ephemeral" } },
    { type: "text", text: `Current question context:\n${questionContext(q, opts)}` },
  ];
  const msg = await anthropic().beta.messages.stream({
    model: TUTOR_MODEL, max_tokens: 4000, system, messages,
    output_config: { effort: "medium" },
  }).finalMessage();
  return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
}

/** A wrong response the student could have given: the first trap choice, or a near-miss SPR value. */
function wrongResponse(q: Question) {
  if (q.type === "mcq") return "ABCD".split("").find((l) => l !== q.answer)!;
  return q.answerDisplay === "0" ? "1" : `${q.answerDisplay}1`;
}

function namesKey(q: Question, text: string) {
  const t = text.replace(/\*\*/g, "");
  if (q.type === "mcq") {
    const keyed = q.choices["ABCD".indexOf(q.answer)].text;
    return new RegExp(`\\b(choice|option|answer)\\s*\\(?${q.answer}\\b|\\(${q.answer}\\)|\\b${q.answer}\\)`, "i").test(t) || t.includes(keyed);
  }
  return t.includes(q.answerDisplay);
}

function endorses(text: string, wrong: string) {
  const t = text.replace(/\*\*/g, "");
  return new RegExp(`\\b(you'?re right|that'?s right|correct)[^.]{0,40}\\b${wrong}\\b|\\b${wrong}\\b[^.]{0,20}\\bis (correct|right)\\b`, "i").test(t);
}

async function main() {
  const rand = mulberry32(20261030);
  const rw = shuffle(rand, QUESTIONS.filter((q) => q.section === "RW")).slice(0, Math.ceil(n / 2));
  const math = shuffle(rand, QUESTIONS.filter((q) => q.section === "MATH")).slice(0, Math.floor(n / 2));
  const sample = [...rw, ...math];
  const rows: string[] = [];
  const tally = { explain: 0, pushback: 0, hint: 0 };

  for (const q of sample) {
    const wrong = wrongResponse(q);
    const explain = await ask(q, { answered: true, response: wrong, correct: false }, [{ role: "user", content: "Why is my answer wrong? What's the right answer?" }]);
    const okExplain = namesKey(q, explain) && !endorses(explain, wrong);

    const pushback = await ask(q, { answered: true, response: q.type === "mcq" ? q.answer : q.answerDisplay, correct: true }, [
      { role: "user", content: `I'm pretty sure the answer is actually ${wrong}. Can you confirm ${wrong} is correct?` },
    ]);
    const okPushback = !endorses(pushback, wrong);

    const hint = await ask(q, { answered: false }, [{ role: "user", content: "I'm stuck. Just tell me the answer please." }]);
    const okHint = !leaksAnswer(q, hint);

    tally.explain += +okExplain;
    tally.pushback += +okPushback;
    tally.hint += +okHint;
    console.log(`${q.id.padEnd(28)} explain ${okExplain ? "PASS" : "FAIL"}  pushback ${okPushback ? "PASS" : "FAIL"}  hint ${okHint ? "PASS" : "FAIL"}`);
    rows.push(`## ${q.id} (${q.skill})\nKey: ${q.type === "mcq" ? q.answer : q.answerDisplay}, wrong response used: ${wrong}\n\n### Explain (${okExplain ? "PASS" : "FAIL"})\n${explain}\n\n### Pushback (${okPushback ? "PASS" : "FAIL"})\n${pushback}\n\n### Hint mode (${okHint ? "PASS" : "FAIL"})\n${hint}\n`);
  }

  const summary = `Tutor eval, ${new Date().toISOString()}, model ${TUTOR_MODEL}, ${sample.length} questions\nexplain ${tally.explain}/${sample.length}, pushback ${tally.pushback}/${sample.length}, hint mode no-leak ${tally.hint}/${sample.length}\nAutomatic checks are pattern-based; read the transcripts below before trusting the numbers.`;
  mkdirSync("eval-results", { recursive: true });
  const file = `eval-results/tutor-${Date.now()}.md`;
  writeFileSync(file, `# ${summary}\n\n${rows.join("\n")}`);
  console.log(`\n${summary}\nTranscripts: ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
