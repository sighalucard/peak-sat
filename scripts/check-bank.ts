// Run with: npm run check:bank. Builds the whole bank and reports any rejected questions.
import { buildMathQuestions } from "../src/content/math-templates";
import { MATH_WRITTEN } from "../src/content/math-written";
import { RW_INFO_IDEAS } from "../src/content/rw-info-ideas";
import { RW_CRAFT } from "../src/content/rw-craft";
import { RW_EXPRESSION } from "../src/content/rw-expression";
import { RW_CONVENTIONS } from "../src/content/rw-conventions";
import { RW_MORE } from "../src/content/rw-more";
import { validateQuestion } from "../src/content/validate";
import { SKILLS } from "../src/content/taxonomy";

const all = [...RW_INFO_IDEAS, ...RW_CRAFT, ...RW_EXPRESSION, ...RW_CONVENTIONS, ...RW_MORE, ...buildMathQuestions(), ...MATH_WRITTEN];
let bad = 0;
const seen = new Set<string>();
for (const q of all) { if (seen.has(q.id)) { bad++; console.log(q.id, ["duplicate id"]); } seen.add(q.id); }
for (const q of all) {
  const p = validateQuestion(q);
  if (p.length) { bad++; console.log(q.id, p); }
}
const bySkill = new Map<string, number[]>();
for (const q of all) { const a = bySkill.get(q.skill) ?? [0, 0, 0]; a[q.difficulty - 1]++; bySkill.set(q.skill, a); }
for (const s of SKILLS) console.log(s.id.padEnd(24), (bySkill.get(s.id) ?? [0, 0, 0]).join(" / "));
console.log(`total ${all.length}, rejected ${bad}, RW ${all.filter((q) => q.section === "RW").length}, MATH ${all.filter((q) => q.section === "MATH").length}`);
process.exit(bad ? 1 : 0);
