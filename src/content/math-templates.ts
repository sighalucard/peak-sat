// Parameterized SAT-style math templates. Every instance's answer is computed in code,
// every distractor comes from a named, realistic mistake, and every instance carries an
// independent `check` that substitutes the value back into the original problem.

import type { Choice, Difficulty, Letter, Question } from "./types";
import type { DomainId, MistakeCategory } from "./taxonomy";
import { validateQuestion } from "./validate";
import { approx, cterm, fmt, hashString, mulberry32, pick, randInt, shuffle, term, type Rng } from "./math-util";

interface Distractor {
  value: number;
  rationale: string;
  trap: MistakeCategory;
  /** Optional custom display (e.g. an expression instead of a number). */
  display?: string;
}

interface Instance {
  stem: string;
  correct: number;
  correctDisplay?: string;
  correctRationale: string;
  /** Exactly 3 for multiple choice; omit for student-produced response. */
  distractors?: Distractor[];
  sprTraps?: Distractor[];
  hints: [string, string, string];
  explanation: string;
  takeaway: string;
  check: (v: number) => boolean;
  table?: Question["table"];
  /** Display formatter for choices (default: fmt). */
  show?: (v: number) => string;
}

interface Template {
  id: string;
  skill: string;
  domain: DomainId;
  difficulty: Difficulty;
  expectedSec: number;
  count: number;
  gen: (r: Rng) => Instance | null;
}

const T: Template[] = [];
const add = (t: Template) => T.push(t);

// ───────────────────────── Algebra ─────────────────────────

add({
  id: "lin1-basic", skill: "linear-one-var", domain: "ALG", difficulty: 1, expectedSec: 45, count: 8,
  gen(r) {
    const a = randInt(r, 2, 9), x = randInt(r, -6, 12), b = randInt(r, -15, 15);
    if (b === 0 || x === 0) return null;
    const c = a * x + b;
    return {
      stem: `If ${a}x${cterm(b)} = ${fmt(c)}, what is the value of x?`,
      correct: x,
      correctRationale: `Subtract ${fmt(b)} from both sides to get ${a}x = ${fmt(c - b)}, then divide by ${a}.`,
      distractors: [
        { value: (c + b) / a, rationale: `This comes from adding ${fmt(b)} to both sides instead of subtracting it.`, trap: "algebra" },
        { value: c / a - b, rationale: `This divides by ${a} before removing the constant, but the constant wasn't divided by ${a}.`, trap: "algebra" },
        { value: c - b, rationale: `This is the value of ${a}x, not x. The last step, dividing by ${a}, was skipped.`, trap: "misread" },
      ],
      hints: [
        "The goal is to get x alone on one side of the equation.",
        "Undo the operations in reverse order: deal with the added constant first, then the coefficient.",
        `Start by subtracting ${fmt(b)} from both sides. What does ${a}x equal then?`,
      ],
      explanation: `${a}x${cterm(b)} = ${fmt(c)}\nSubtract ${fmt(b)} from both sides: ${a}x = ${fmt(c - b)}\nDivide both sides by ${a}: x = ${fmt(x)}\nCheck: ${a}(${fmt(x)})${cterm(b)} = ${fmt(c)} ✓`,
      takeaway: "Isolate the variable by undoing addition/subtraction first, then multiplication/division. Always plug your answer back in when time allows.",
      check: (v) => approx(a * v + b, c),
    };
  },
});

add({
  id: "lin1-both-sides", skill: "linear-one-var", domain: "ALG", difficulty: 2, expectedSec: 75, count: 7,
  gen(r) {
    const a = randInt(r, 2, 6), p = randInt(r, -5, 6), c = randInt(r, 1, 9);
    const x = randInt(r, -8, 10);
    if (c === a || p === 0) return null;
    const d = a * (x + p) - c * x;
    const wrongDistrib = (d - p) / (a - c); // forgot to distribute a to p
    return {
      stem: `${a}(x${cterm(p)}) = ${c}x${cterm(d)}\n\nWhat value of x is the solution to the equation above?`,
      correct: x,
      correctRationale: "Distribute, collect x-terms on one side, and solve.",
      sprTraps: [{ value: wrongDistrib, rationale: `This happens when ${a} is multiplied by x but not by ${fmt(p)}.`, trap: "algebra" }],
      hints: [
        "There are parentheses on the left. What has to happen to them first?",
        `Distribute ${a} to both terms inside the parentheses, then get all x-terms on one side.`,
        `After distributing you get ${a}x${cterm(a * p)} = ${c}x${cterm(d)}. Subtract ${c}x from both sides next.`,
      ],
      explanation: `Distribute: ${a}x${cterm(a * p)} = ${c}x${cterm(d)}\nSubtract ${c}x: ${a - c}x${cterm(a * p)} = ${fmt(d)}\nSubtract ${fmt(a * p)}: ${a - c}x = ${fmt(d - a * p)}\nDivide by ${a - c}: x = ${fmt(x)}`,
      takeaway: "Distribute to every term inside parentheses. Most errors on these come from multiplying only the first term.",
      check: (v) => approx(a * (v + p), c * v + d),
    };
  },
});

add({
  id: "lin1-no-solution", skill: "linear-one-var", domain: "ALG", difficulty: 3, expectedSec: 90, count: 6,
  gen(r) {
    const a = randInt(r, 2, 7), b = randInt(r, 1, 9), m = randInt(r, 2, 4), c = randInt(r, 1, 20);
    // m(ax + b) = kx + c has no solution when k = m*a and c ≠ m*b
    if (c === m * b) return null;
    const k = m * a;
    return {
      stem: `${m}(${a}x + ${b}) = kx + ${c}\n\nIn the equation above, k is a constant. If the equation has no solution, what is the value of k?`,
      correct: k,
      correctRationale: `Expanding gives ${k}x + ${m * b}. With k = ${k}, the x-terms cancel and you are left with ${m * b} = ${c}, which is false, so there is no solution.`,
      distractors: [
        { value: a, rationale: `This matches the coefficient inside the parentheses but ignores the factor of ${m} outside.`, trap: "algebra" },
        { value: m * b, rationale: "This is the constant term after distributing, not the coefficient of x.", trap: "concept" },
        { value: k + m, rationale: "No solution requires equal slopes (x-coefficients); this value makes the coefficients unequal, which gives exactly one solution.", trap: "concept" },
      ],
      hints: [
        "Think about what has to be true for a linear equation to have no solution.",
        "A linear equation has no solution when the x-terms cancel but the constants don't match.",
        `Distribute the left side first. What is the coefficient of x on the left after you multiply by ${m}?`,
      ],
      explanation: `Left side: ${m}(${a}x + ${b}) = ${k}x + ${m * b}\nThe equation is ${k}x + ${m * b} = kx + ${c}.\n• If k ≠ ${k}, you can solve for exactly one x.\n• If k = ${k}, the x-terms cancel, leaving ${m * b} = ${c}, which is never true.\nSo the equation has no solution when k = ${k}.`,
      takeaway: "No solution: same x-coefficient, different constants. Infinitely many: same x-coefficient AND same constant. Exactly one: different x-coefficients.",
      check: (v) => approx(v, k) && c !== m * b,
    };
  },
});

add({
  id: "linf-evaluate", skill: "linear-functions", domain: "ALG", difficulty: 1, expectedSec: 40, count: 6,
  gen(r) {
    const m = randInt(r, -6, 8), b = randInt(r, -12, 12), n = randInt(r, -5, 9);
    if (m === 0 || m === 1 || b === 0 || n === 0 || n === 1) return null;
    const y = m * n + b;
    return {
      stem: `The function f is defined by f(x) = ${m === -1 ? "−x" : `${fmt(m)}x`}${cterm(b)}. What is the value of f(${fmt(n)})?`,
      correct: y,
      correctRationale: `Substitute ${fmt(n)} for x: ${fmt(m)}(${fmt(n)})${cterm(b)} = ${fmt(y)}.`,
      distractors: [
        { value: m + n + b, rationale: `This adds ${fmt(n)} to the coefficient instead of multiplying.`, trap: "concept" },
        { value: m * (n + b), rationale: "This adds the constant before multiplying, which breaks the order of operations.", trap: "calculation" },
        { value: (n - b) / m, rationale: `This solves f(x) = ${fmt(n)} for x instead of evaluating f at x = ${fmt(n)}.`, trap: "misread" },
      ],
      hints: [
        `f(${fmt(n)}) means "the output when the input is ${fmt(n)}."`,
        "Replace every x in the rule with the input value.",
        `Compute ${fmt(m)} × ${fmt(n)} first, then add ${fmt(b)}.`,
      ],
      explanation: `f(${fmt(n)}) = ${fmt(m)}(${fmt(n)})${cterm(b)} = ${fmt(m * n)}${cterm(b)} = ${fmt(y)}`,
      takeaway: "f(a) asks for the output at input a. Don't confuse it with solving f(x) = a.",
      check: (v) => approx(v, m * n + b),
    };
  },
});

add({
  id: "linf-context", skill: "linear-functions", domain: "ALG", difficulty: 2, expectedSec: 70, count: 6,
  gen(r) {
    const fee = randInt(r, 3, 12) * 5, rate = randInt(r, 8, 25), total = fee + rate * randInt(r, 4, 14);
    const n = (total - fee) / rate;
    const thing = pick(r, [
      ["gym membership", "a one-time sign-up fee", "per month", "months"],
      ["car rental", "a fixed booking fee", "per day", "days"],
      ["music lesson package", "a registration fee", "per lesson", "lessons"],
    ] as const);
    return {
      stem: `The total cost C, in dollars, of a ${thing[0]} for n ${thing[3]} is given by C = ${rate}n + ${fee}, which includes ${thing[1]}. If the total cost was $${total}, for how many ${thing[3]} did the customer pay?`,
      correct: n,
      correctRationale: `Set ${rate}n + ${fee} = ${total}, subtract ${fee}, and divide by ${rate}.`,
      distractors: [
        { value: total / rate, rationale: `This divides the total by ${rate} without first removing the $${fee} fixed fee.`, trap: "concept" },
        { value: (total + fee) / rate, rationale: "This adds the fixed fee instead of subtracting it.", trap: "algebra" },
        { value: rate * total + fee, rationale: `This plugs ${total} in as n instead of setting C equal to ${total}.`, trap: "misread" },
      ].filter((d) => Number.isFinite(d.value)) as Distractor[],
      hints: [
        "Which variable does the $" + total + " represent, C or n?",
        `Set the expression for C equal to ${total} and solve for n.`,
        `Subtract the fixed amount, ${fee}, from ${total} first. What's left is paid at $${rate} ${thing[2]}.`,
      ],
      explanation: `${rate}n + ${fee} = ${total}\n${rate}n = ${total - fee}\nn = ${total - fee} ÷ ${rate} = ${fmt(n)}`,
      takeaway: "In a linear model C = rate·n + fixed, the constant is the starting/fixed amount and the coefficient is the per-unit rate.",
      check: (v) => approx(rate * v + fee, total),
    };
  },
});

add({
  id: "linf-two-points", skill: "linear-functions", domain: "ALG", difficulty: 2, expectedSec: 80, count: 6,
  gen(r) {
    const m = pick(r, [-3, -2, -1, 2, 3, 4, 1 / 2, -1 / 2, 3 / 2]);
    const b = randInt(r, -9, 9);
    const x1 = randInt(r, -4, 2) * 2, x2 = x1 + randInt(r, 1, 4) * 2;
    const y1 = m * x1 + b, y2 = m * x2 + b;
    if (!Number.isInteger(y1) || !Number.isInteger(y2) || x1 === 0) return null;
    return {
      stem: `A line in the xy-plane passes through the points (${fmt(x1)}, ${fmt(y1)}) and (${fmt(x2)}, ${fmt(y2)}). What is the y-coordinate of the y-intercept of the line?`,
      correct: b,
      correctRationale: `The slope is (${fmt(y2)} − ${fmt(y1)}) / (${fmt(x2)} − ${fmt(x1)}) = ${fmt(m)}, and b = y − mx = ${fmt(b)}.`,
      distractors: [
        { value: m, rationale: "This is the slope of the line, not its y-intercept.", trap: "misread" },
        { value: y1 + m * x1, rationale: "This adds m·x to y instead of subtracting it when solving y = mx + b for b.", trap: "algebra" },
        { value: y1 - (1 / m) * x1, rationale: "This uses the reciprocal of the slope (run over rise).", trap: "formula" },
      ],
      hints: [
        "A line's equation can be written as y = mx + b. Which of m and b are you being asked for?",
        "Find the slope first using rise over run, then use one point to find b.",
        `The slope is (${fmt(y2)} − ${fmt(y1)}) ÷ (${fmt(x2)} − ${fmt(x1)}). Substitute it and the point (${fmt(x1)}, ${fmt(y1)}) into y = mx + b.`,
      ],
      explanation: `Slope: m = (${fmt(y2)} − ${fmt(y1)}) / (${fmt(x2)} − ${fmt(x1)}) = ${fmt(y2 - y1)} / ${fmt(x2 - x1)} = ${fmt(m)}\nUse (${fmt(x1)}, ${fmt(y1)}): ${fmt(y1)} = ${fmt(m)}(${fmt(x1)}) + b\nb = ${fmt(y1)} − ${fmt(m * x1)} = ${fmt(b)}`,
      takeaway: "Slope = (y₂ − y₁)/(x₂ − x₁). Then plug any point into y = mx + b to get b. Desmos tip: type both points and the line y = mx + b with sliders, or use a regression y1 ~ m x1 + b.",
      check: (v) => approx(y1, m * x1 + v) && approx(y2, m * x2 + v),
    };
  },
});

add({
  id: "lin2-intercept", skill: "linear-two-var", domain: "ALG", difficulty: 2, expectedSec: 70, count: 6,
  gen(r) {
    const a = randInt(r, 2, 9), b = randInt(r, 2, 9), k = randInt(r, 2, 8);
    const c = a * b * k;
    const item = pick(r, [["adult tickets", "child tickets"], ["large boxes", "small boxes"], ["hardcover books", "paperback books"]] as const);
    const x = randInt(r, 1, b * k - 1);
    const yNum = c - a * x;
    if (yNum % b !== 0) return null;
    const y = yNum / b;
    return {
      stem: `The equation ${a}x + ${b}y = ${c} represents the possible numbers of ${item[0]}, x, and ${item[1]}, y, that cost a total of $${c}. If ${x} ${item[0]} were bought, how many ${item[1]} were bought?`,
      correct: y,
      correctRationale: `Substitute x = ${x}: ${b}y = ${c} − ${a * x} = ${yNum}, so y = ${y}.`,
      sprTraps: [{ value: (c - x) / b, rationale: `This subtracts ${x} instead of ${a}·${x} = ${a * x}.`, trap: "calculation" }],
      hints: [
        "You know the value of one variable. Where does it go?",
        `Substitute x = ${x} into the equation, then solve for y.`,
        `${a}(${x}) = ${a * x}. Subtract that from ${c}, then divide by ${b}.`,
      ],
      explanation: `${a}(${x}) + ${b}y = ${c}\n${a * x} + ${b}y = ${c}\n${b}y = ${yNum}\ny = ${y}`,
      takeaway: "In a two-variable linear equation, knowing one variable lets you solve for the other by substitution.",
      check: (v) => approx(a * x + b * v, c),
    };
  },
});

add({
  id: "sys-elim", skill: "systems", domain: "ALG", difficulty: 1, expectedSec: 60, count: 6,
  gen(r) {
    const x = randInt(r, -5, 12), y = randInt(r, -5, 12);
    if (x === y) return null;
    const s = x + y, d = x - y;
    return {
      stem: `x + y = ${fmt(s)}\nx − y = ${fmt(d)}\n\nWhat is the solution (x, y) to the system of equations above? Give the value of x.`,
      correct: x,
      correctRationale: `Adding the equations gives 2x = ${fmt(s + d)}, so x = ${fmt(x)}.`,
      distractors: [
        { value: y, rationale: "This is the value of y, not x.", trap: "misread" },
        { value: s + d, rationale: "This is 2x. The final division by 2 was skipped.", trap: "calculation" },
        { value: (s - d) / 2 + d, rationale: "This mixes up the signs when combining the equations.", trap: "algebra" },
      ],
      hints: [
        "Notice that y appears with opposite signs in the two equations.",
        "Add the two equations together so that y cancels.",
        `Adding gives 2x = ${fmt(s)} + ${fmt(d)}. Now solve for x.`,
      ],
      explanation: `Add the equations: (x + y) + (x − y) = ${fmt(s)} + ${fmt(d)}\n2x = ${fmt(s + d)}\nx = ${fmt(x)}\n(Then y = ${fmt(s)} − ${fmt(x)} = ${fmt(y)}.)`,
      takeaway: "When one variable has opposite coefficients, add the equations (elimination). In Desmos, graph both lines and click the intersection.",
      check: (v) => approx(v + (s - v), s) && approx(v - (s - v), d),
    };
  },
});

add({
  id: "sys-general", skill: "systems", domain: "ALG", difficulty: 2, expectedSec: 100, count: 6,
  gen(r) {
    const x = randInt(r, -4, 8), y = randInt(r, -4, 8);
    const a = randInt(r, 1, 5), b = randInt(r, 1, 5) * pick(r, [1, -1]), c2 = randInt(r, 1, 5), d2 = randInt(r, 1, 5) * pick(r, [1, -1]);
    if (a * d2 - b * c2 === 0) return null;
    const e = a * x + b * y, f = c2 * x + d2 * y;
    const ask = pick(r, ["x", "y", "x + y"] as const);
    const ans = ask === "x" ? x : ask === "y" ? y : x + y;
    return {
      stem: `${a === 1 ? "" : a}x${term(b, "y")} = ${fmt(e)}\n${c2 === 1 ? "" : c2}x${term(d2, "y")} = ${fmt(f)}\n\nIf (x, y) is the solution to the system of equations above, what is the value of ${ask}?`,
      correct: ans,
      correctRationale: `Solving the system gives x = ${fmt(x)} and y = ${fmt(y)}.`,
      sprTraps: ask === "x + y" ? [{ value: x, rationale: "This is only x; the question asks for x + y.", trap: "misread" }] : [],
      hints: [
        "You need values that make both equations true at once.",
        "Use elimination: multiply one or both equations so one variable has matching coefficients, then subtract.",
        `Multiply the first equation by ${c2} and the second by ${a}; the x-terms become equal. Subtract to find y.`,
      ],
      explanation: `Multiply the first equation by ${c2}: ${a * c2}x${term(b * c2, "y")} = ${fmt(e * c2)}\nMultiply the second by ${a}: ${a * c2}x${term(d2 * a, "y")} = ${fmt(f * a)}\nSubtract: ${fmt(b * c2 - d2 * a)}y = ${fmt(e * c2 - f * a)}, so y = ${fmt(y)}\nSubstitute back: x = ${fmt(x)}\nSo ${ask} = ${fmt(ans)}.`,
      takeaway: "Elimination is usually fastest when coefficients are small integers. Desmos: graph both equations and click the intersection point to read (x, y).",
      check: (v) => approx(v, ans) && approx(a * x + b * y, e) && approx(c2 * x + d2 * y, f),
    };
  },
});

add({
  id: "sys-no-solution", skill: "systems", domain: "ALG", difficulty: 3, expectedSec: 90, count: 6,
  gen(r) {
    const a = randInt(r, 2, 6), b = randInt(r, 2, 7), c = randInt(r, 3, 20), m = randInt(r, 2, 4), d = randInt(r, 3, 40);
    if (d === m * c) return null;
    const k = m * a;
    return {
      stem: `${a}x + ${b}y = ${c}\nkx + ${m * b}y = ${d}\n\nIn the system of equations above, k is a constant. For what value of k does the system have no solution?`,
      correct: k,
      correctRationale: `With k = ${k}, the second equation's left side is ${m} times the first's, but ${d} ≠ ${m}·${c} = ${m * c}, so the lines are parallel and distinct.`,
      distractors: [
        { value: a, rationale: "This keeps the same x-coefficient, but the y-coefficient was multiplied by " + m + ", so the lines would not be parallel.", trap: "concept" },
        { value: m * b, rationale: "This is the y-coefficient of the second equation, not the needed x-coefficient.", trap: "misread" },
        { value: d / c * a, rationale: "This scales by the ratio of the constants. Parallel lines need proportional x and y coefficients, not constants.", trap: "concept" },
      ],
      hints: [
        "What does it look like on a graph when a system has no solution?",
        "No solution means the lines are parallel: same slope, different intercepts. The coefficients of x and y must be in the same ratio.",
        `The y-coefficient went from ${b} to ${m * b}, which is ×${m}. What must happen to the x-coefficient?`,
      ],
      explanation: `For no solution, the two lines must be parallel and distinct.\nThe y-coefficients are ${b} and ${m * b}, a ratio of ${m}.\nThe x-coefficients must have the same ratio: k = ${m} × ${a} = ${k}.\nCheck the constants: ${m} × ${c} = ${m * c} ≠ ${d}, so the lines are distinct. No solution.`,
      takeaway: "Two linear equations have no solution when the coefficients are proportional but the constants are not.",
      check: (v) => approx(v / a, (m * b) / b) && !approx(d / c, m),
    };
  },
});

add({
  id: "ineq-max", skill: "linear-inequalities", domain: "ALG", difficulty: 2, expectedSec: 75, count: 6,
  gen(r) {
    const budget = randInt(r, 8, 30) * 10, fixed = randInt(r, 2, 9) * 5, each = pick(r, [6, 7, 8, 9, 12, 15]);
    const exact = (budget - fixed) / each;
    if (Number.isInteger(exact)) return null;
    const n = Math.floor(exact);
    return {
      stem: `A club has at most $${budget} to spend on a trip. The bus costs $${fixed}, and each ticket costs $${each}. What is the greatest number of tickets the club can buy?`,
      correct: n,
      correctRationale: `${each}t + ${fixed} ≤ ${budget} gives t ≤ ${fmt(exact)}, and t must be a whole number, so t = ${n}.`,
      distractors: [
        { value: n + 1, rationale: "This rounds up, which would exceed the budget.", trap: "concept" },
        { value: Math.floor(budget / each), rationale: `This ignores the $${fixed} bus cost.`, trap: "misread" },
        { value: Math.floor((budget + fixed) / each), rationale: "This adds the bus cost to the budget instead of subtracting it.", trap: "algebra" },
      ],
      hints: [
        "Write an inequality: total spent must be at most the budget.",
        `Let t be the number of tickets. Total cost is ${each}t + ${fixed}. Solve ${each}t + ${fixed} ≤ ${budget}.`,
        "You can't buy part of a ticket. After solving, which whole number is the largest one that still fits?",
      ],
      explanation: `${each}t + ${fixed} ≤ ${budget}\n${each}t ≤ ${budget - fixed}\nt ≤ ${fmt(exact)} ≈ ${exact.toFixed(2)}\nTickets come in whole numbers, so the greatest is ${n}.\nCheck: ${each}·${n} + ${fixed} = ${each * n + fixed} ≤ ${budget} ✓; ${each}·${n + 1} + ${fixed} = ${each * (n + 1) + fixed} > ${budget} ✗`,
      takeaway: "For 'greatest number' inequality questions, round DOWN for maximum counts (and up for minimum counts), then verify both neighbors.",
      check: (v) => Number.isInteger(v) && each * v + fixed <= budget && each * (v + 1) + fixed > budget,
    };
  },
});

add({
  id: "ineq-solve", skill: "linear-inequalities", domain: "ALG", difficulty: 1, expectedSec: 50, count: 5,
  gen(r) {
    const a = -randInt(r, 2, 6), b = randInt(r, -10, 10), x0 = randInt(r, -6, 8);
    const c = a * x0 + b;
    // a x + b > c  with a<0  ⇒  x < x0
    return {
      stem: `The inequality ${fmt(a)}x${cterm(b)} > ${fmt(c)} is equivalent to x < k, where k is a constant. What is the value of k?`,
      correct: x0,
      correctRationale: `Subtract ${fmt(b)}: ${fmt(a)}x > ${fmt(c - b)}. Dividing by ${fmt(a)} (negative) flips the sign: x < ${fmt(x0)}.`,
      sprTraps: [{ value: -x0, rationale: "A sign error when dividing by a negative number.", trap: "algebra" }],
      hints: [
        "Solve it like an equation, but watch one special rule.",
        "When you multiply or divide both sides of an inequality by a negative number, the inequality sign flips.",
        `After subtracting ${fmt(b)}, divide both sides by ${fmt(a)}, and remember to flip > to <.`,
      ],
      explanation: `${fmt(a)}x${cterm(b)} > ${fmt(c)}\n${fmt(a)}x > ${fmt(c - b)}\nDivide by ${fmt(a)} and flip the sign: x < ${fmt(x0)}`,
      takeaway: "Dividing or multiplying an inequality by a negative flips the sign. Test a number in the original to confirm the direction.",
      check: (v) => approx(a * v + b, c) && a * (v - 1) + b > c && !(a * (v + 1) + b > c),
    };
  },
});

// ───────────────────────── Advanced Math ─────────────────────────

add({
  id: "eq-expand", skill: "equivalent-expressions", domain: "ADV", difficulty: 1, expectedSec: 50, count: 6,
  gen(r) {
    const p = randInt(r, -7, 7), q = randInt(r, -7, 7);
    if (p === 0 || q === 0 || p === -q || p === q) return null;
    const B = p + q, C = p * q;
    const expr = (b: number, c: number) => `x²${term(b)}${cterm(c)}`;
    return {
      stem: `Which expression is equivalent to (x${cterm(p)})(x${cterm(q)})?`,
      correct: 0,
      correctDisplay: expr(B, C),
      correctRationale: `FOIL: x² + ${fmt(q)}x + ${fmt(p)}x + ${fmt(p)}·${fmt(q)} = ${expr(B, C)}.`,
      distractors: [
        { value: 1, display: `x²${cterm(C)}`, rationale: "This drops the middle term; only the first and last products were multiplied.", trap: "algebra" },
        { value: 2, display: expr(C, B), rationale: "This swaps the sum and the product of the constants.", trap: "concept" },
        { value: 3, display: expr(B, p + q === C ? C + 1 : p + q), rationale: "This adds the constants for the last term instead of multiplying them.", trap: "calculation" },
      ],
      hints: [
        "Every term in the first binomial must multiply every term in the second.",
        "Use FOIL: First, Outer, Inner, Last.",
        `The middle term is ${fmt(q)}x + ${fmt(p)}x. What is the constant term ${fmt(p)} × ${fmt(q)}?`,
      ],
      explanation: `(x${cterm(p)})(x${cterm(q)})\n= x·x + x·(${fmt(q)}) + (${fmt(p)})·x + (${fmt(p)})(${fmt(q)})\n= x²${term(B)}${cterm(C)}`,
      takeaway: "(x + p)(x + q) = x² + (p + q)x + pq. Recognize this pattern both ways for factoring.",
      check: (v) => v === 0,
    };
  },
});

add({
  id: "eq-square", skill: "equivalent-expressions", domain: "ADV", difficulty: 2, expectedSec: 70, count: 6,
  gen(r) {
    const a = randInt(r, 2, 6), b = randInt(r, -9, 9);
    if (b === 0) return null;
    const mid = 2 * a * b;
    return {
      stem: `The expression (${a}x${cterm(b)})² is equivalent to ${a * a}x² + kx + ${b * b}, where k is a constant. What is the value of k?`,
      correct: mid,
      correctRationale: `(${a}x${cterm(b)})² = ${a * a}x² + 2(${a})(${fmt(b)})x + ${b * b}, so k = ${fmt(mid)}.`,
      distractors: [
        { value: a * b, rationale: "This forgets the factor of 2 in the middle term of a squared binomial.", trap: "formula" },
        { value: 0, rationale: "This treats (a + b)² as a² + b², which is a very common error.", trap: "concept" },
        { value: -mid, rationale: "The sign of the middle term matches the sign of b.", trap: "algebra" },
      ],
      hints: [
        "Squaring a binomial is NOT the same as squaring each term.",
        "(u + v)² = u² + 2uv + v². Identify u and v.",
        `Here u = ${a}x and v = ${fmt(b)}. The middle term is 2·u·v.`,
      ],
      explanation: `(${a}x${cterm(b)})² = (${a}x)² + 2(${a}x)(${fmt(b)}) + (${fmt(b)})²\n= ${a * a}x²${term(mid)} + ${b * b}\nSo k = ${fmt(mid)}.`,
      takeaway: "(u + v)² = u² + 2uv + v². The 2uv middle term is where most errors happen.",
      check: (v) => approx(v, 2 * a * b),
    };
  },
});

add({
  id: "quad-roots", skill: "nonlinear-equations", domain: "ADV", difficulty: 2, expectedSec: 75, count: 7,
  gen(r) {
    const r1 = randInt(r, 1, 11), r2 = -randInt(r, 1, 11);
    if (r1 === -r2) return null;
    const B = -(r1 + r2), C = r1 * r2;
    return {
      stem: `x²${term(B)}${cterm(C)} = 0\n\nWhat is the positive solution to the equation above?`,
      correct: r1,
      correctRationale: `The equation factors as (x − ${r1})(x + ${-r2}) = 0, so x = ${r1} or x = ${r2}. The positive solution is ${r1}.`,
      distractors: [
        { value: -r2, rationale: "This is the absolute value of the negative root; the sign in the factor was read as the root itself.", trap: "algebra" },
        { value: -B, rationale: "This is the sum of the solutions, not a solution.", trap: "concept" },
        { value: Math.abs(C), rationale: "This is the absolute value of the product of the solutions.", trap: "concept" },
      ],
      hints: [
        "Can this quadratic be factored?",
        `Look for two numbers that multiply to ${fmt(C)} and add to ${fmt(B)}.`,
        `The numbers are ${fmt(-r1)} and ${fmt(-r2)}. Set each factor equal to zero.`,
      ],
      explanation: `Find two numbers with product ${fmt(C)} and sum ${fmt(B)}: ${fmt(-r1)} and ${fmt(-r2)}.\nx²${term(B)}${cterm(C)} = (x − ${r1})(x + ${-r2}) = 0\nx = ${r1} or x = ${fmt(r2)}\nPositive solution: ${r1}.`,
      takeaway: "If (x − a)(x − b) = 0 then x = a or b. The roots have the OPPOSITE sign of the numbers in the factors. Desmos: graph y = the expression and click the x-intercepts.",
      check: (v) => approx(v * v + B * v + C, 0) && v > 0,
    };
  },
});

add({
  id: "quad-sum-roots", skill: "nonlinear-equations", domain: "ADV", difficulty: 3, expectedSec: 80, count: 6,
  gen(r) {
    const a = randInt(r, 2, 5), b = randInt(r, -20, 20), c = -randInt(r, 1, 20);
    if (b === 0 || b % a === 0 && false) return null;
    const sum = -b / a;
    return {
      stem: `What is the sum of the solutions to ${a}x²${term(b)}${cterm(c)} = 0?`,
      correct: sum,
      correctRationale: `For ax² + bx + c = 0, the sum of the solutions is −b/a = ${fmt(-b)}/${a} = ${fmt(sum)}.`,
      distractors: [
        { value: b / a, rationale: "This is b/a; the sum of roots is −b/a.", trap: "formula" },
        { value: c / a, rationale: "This is c/a, which is the product of the solutions, not the sum.", trap: "formula" },
        { value: -b, rationale: "This forgets to divide by the leading coefficient a.", trap: "formula" },
      ],
      hints: [
        "You don't need to find each solution separately.",
        "There's a relationship between the coefficients of a quadratic and the sum of its solutions.",
        "For ax² + bx + c = 0, sum of solutions = −b/a. Identify a and b.",
      ],
      explanation: `The quadratic formula gives x = (−b ± √(b² − 4ac)) / (2a). Adding the two solutions, the ± parts cancel: sum = −2b/(2a) = −b/a.\nHere a = ${a} and b = ${fmt(b)}, so the sum = ${fmt(-b)}/${a} = ${fmt(sum)}.\n(The discriminant ${b * b - 4 * a * c} > 0, so both solutions are real.)`,
      takeaway: "Sum of roots = −b/a; product of roots = c/a. Saves a lot of time on hard quadratics.",
      check: (v) => {
        const disc = b * b - 4 * a * c;
        if (disc < 0) return false;
        const x1 = (-b + Math.sqrt(disc)) / (2 * a), x2 = (-b - Math.sqrt(disc)) / (2 * a);
        return approx(v, x1 + x2, 1e-7);
      },
    };
  },
});

add({
  id: "radical-eq", skill: "nonlinear-equations", domain: "ADV", difficulty: 2, expectedSec: 60, count: 5,
  gen(r) {
    const k = randInt(r, 2, 9), a = randInt(r, -10, 10);
    const x = k * k - a;
    return {
      stem: `√(x${cterm(a)}) = ${k}\n\nWhat value of x satisfies the equation above?`,
      correct: x,
      correctRationale: `Square both sides: x${cterm(a)} = ${k * k}, so x = ${fmt(x)}.`,
      sprTraps: [{ value: k - a, rationale: "This forgets to square both sides.", trap: "algebra" }],
      hints: [
        "How do you undo a square root?",
        "Square both sides of the equation.",
        `Squaring gives x${cterm(a)} = ${k * k}. Solve for x and check it in the original.`,
      ],
      explanation: `Square both sides: x${cterm(a)} = ${k}² = ${k * k}\nx = ${k * k} − (${fmt(a)}) = ${fmt(x)}\nCheck: √(${fmt(x)}${cterm(a)}) = √${k * k} = ${k} ✓`,
      takeaway: "Square both sides to remove a radical, then always check for extraneous solutions.",
      check: (v) => v + a >= 0 && approx(Math.sqrt(v + a), k),
    };
  },
});

add({
  id: "one-solution-disc", skill: "nonlinear-equations", domain: "ADV", difficulty: 3, expectedSec: 90, count: 5,
  gen(r) {
    const b = randInt(r, 1, 8) * 2 * pick(r, [1, -1]);
    const c = (b * b) / 4;
    return {
      stem: `x²${term(b)} + c = 0\n\nIn the equation above, c is a constant. If the equation has exactly one real solution, what is the value of c?`,
      correct: c,
      correctRationale: `Exactly one real solution means the discriminant b² − 4c = 0, so c = ${b * b}/4 = ${c}.`,
      distractors: [
        { value: b * b, rationale: "This sets b² = c instead of b² = 4c.", trap: "formula" },
        { value: Math.abs(b) / 2, rationale: "This is the value that gets squared, b/2, rather than (b/2)².", trap: "calculation" },
        { value: -c, rationale: "The sign is wrong: b² − 4ac = 0 requires c to be positive here.", trap: "algebra" },
      ],
      hints: [
        "How can you tell how many real solutions a quadratic has without solving it?",
        "Use the discriminant b² − 4ac. What value of it gives exactly one solution?",
        `Set (${fmt(b)})² − 4(1)(c) = 0 and solve for c.`,
      ],
      explanation: `For ax² + bx + c = 0, the discriminant is b² − 4ac.\nExactly one real solution ⇔ discriminant = 0.\n(${fmt(b)})² − 4(1)c = 0 → ${b * b} = 4c → c = ${c}.\n(Equivalently, x²${term(b)} + ${c} = (x${cterm(b / 2)})², a perfect square.)`,
      takeaway: "Discriminant b² − 4ac: positive → 2 real solutions, zero → 1, negative → none.",
      check: (v) => approx(b * b - 4 * v, 0),
    };
  },
});

add({
  id: "vertex-min", skill: "nonlinear-functions", domain: "ADV", difficulty: 2, expectedSec: 80, count: 6,
  gen(r) {
    const h = randInt(r, -6, 6), k = randInt(r, -12, 12);
    if (h === 0) return null;
    const B = -2 * h, C = h * h + k;
    return {
      stem: `The function f is defined by f(x) = x²${term(B)}${cterm(C)}. What is the minimum value of f(x)?`,
      correct: k,
      correctRationale: `Completing the square: f(x) = (x${cterm(-h)})²${cterm(k)}. The squared term is at least 0, so the minimum is ${fmt(k)}, at x = ${fmt(h)}.`,
      distractors: [
        { value: h, rationale: "This is the x-value where the minimum occurs, not the minimum value itself.", trap: "misread" },
        { value: C, rationale: "This is f(0), the y-intercept, not the minimum.", trap: "concept" },
        { value: -h, rationale: "This uses the opposite sign of the vertex's x-coordinate.", trap: "algebra" },
      ],
      hints: [
        "The graph is an upward-opening parabola. Where is its lowest point?",
        "The minimum is at the vertex. Its x-coordinate is −b/(2a).",
        `x = −(${fmt(B)})/2 = ${fmt(h)}. Now compute f(${fmt(h)}).`,
      ],
      explanation: `Vertex x-coordinate: −b/(2a) = −(${fmt(B)})/2 = ${fmt(h)}\nf(${fmt(h)}) = ${fmt(h * h)}${cterm(B * h)}${cterm(C)} = ${fmt(k)}\nSo the minimum value is ${fmt(k)}.`,
      takeaway: "For y = ax² + bx + c, the vertex x is −b/(2a). 'Minimum value' asks for y, 'where' asks for x. Desmos shows the vertex when you click the curve.",
      check: (v) => approx(v, Math.min(...Array.from({ length: 2001 }, (_, i) => { const x = h - 10 + i / 100; return x * x + B * x + C; })), 1e-6),
    };
  },
});

add({
  id: "exp-model", skill: "nonlinear-functions", domain: "ADV", difficulty: 2, expectedSec: 70, count: 6,
  gen(r) {
    const P = randInt(r, 2, 9) * 100, pct = pick(r, [10, 20, 25, 50]), grow = pick(r, [true, false]), t = randInt(r, 2, 3);
    const factor = grow ? 1 + pct / 100 : 1 - pct / 100;
    const val = P * factor ** t;
    if (!Number.isInteger(Math.round(val * 100) / 100 * 100)) return null;
    const per = grow ? "hour" : "year";
    const stem = grow
      ? `The population of a bacteria colony increases by ${pct}% each hour. The population is ${P} now. What will the population be ${t} hours from now?`
      : `The value of a piece of equipment decreases by ${pct}% each year. The equipment is worth $${P} now. What will it be worth, in dollars, ${t} years from now?`;
    return {
      stem,
      correct: val,
      correctRationale: `Each year multiplies the value by ${factor}, so after ${t} ${per}s it is ${P}(${factor})^${t} = ${fmt(val)}.`,
      distractors: [
        { value: P * (1 + (grow ? 1 : -1) * (pct / 100) * t), rationale: `This applies ${pct}% of the original amount each ${per} (linear change), not ${pct}% of the current amount (exponential).`, trap: "concept" },
        { value: P * (grow ? 1 - pct / 100 : 1 + pct / 100) ** t, rationale: grow ? "This uses a decrease factor for a quantity that is increasing." : "This uses a growth factor for a quantity that is decreasing.", trap: "misread" },
        { value: P * factor, rationale: `This applies only one ${per} of change.`, trap: "misread" },
      ],
      show: (v) => fmt(Math.round(v * 100) / 100),
      hints: [
        `Is the change the same amount each ${per}, or the same percent each ${per}?`,
        `A ${pct}% ${grow ? "increase" : "decrease"} means multiplying by ${factor} each ${per}.`,
        `Multiply ${P} by ${factor} a total of ${t} times: ${P}(${factor})^${t}.`,
      ],
      explanation: `A ${pct}% ${grow ? "increase" : "decrease"} each ${per} means multiplying by (1 ${grow ? "+" : "−"} ${pct / 100}) = ${factor}.\nAfter ${t} ${per}s: ${P} × ${factor}^${t} = ${fmt(Math.round(val * 100) / 100)}`,
      takeaway: "Same percent each period → exponential: a(1 ± r)^t. Same amount each period → linear.",
      check: (v) => approx(v, P * factor ** t, 1e-6),
    };
  },
});

add({
  id: "func-compose", skill: "nonlinear-functions", domain: "ADV", difficulty: 3, expectedSec: 75, count: 5,
  gen(r) {
    const a = randInt(r, 2, 4), b = randInt(r, -5, 5), c = randInt(r, -6, 6), n = randInt(r, -3, 4);
    if (b === 0 || c === 0) return null;
    const g = (x: number) => a * x + b, f = (x: number) => x * x + c;
    const ans = f(g(n));
    return {
      stem: `f(x) = x²${cterm(c)}\ng(x) = ${a}x${cterm(b)}\n\nThe functions f and g are defined above. What is the value of f(g(${fmt(n)}))?`,
      correct: ans,
      correctRationale: `g(${fmt(n)}) = ${fmt(g(n))}, and f(${fmt(g(n))}) = ${fmt(g(n))}² ${cterm(c).trim()} = ${fmt(ans)}.`,
      distractors: [
        { value: g(f(n)), rationale: `This computes g(f(${fmt(n)})), applying the functions in the wrong order.`, trap: "concept" },
        { value: f(n) * g(n), rationale: "This multiplies f(n) and g(n) instead of composing them.", trap: "concept" },
        { value: g(n) * g(n), rationale: `This squares g(${fmt(n)}) but forgets to add ${fmt(c)}.`, trap: "calculation" },
      ],
      hints: [
        "Composite functions are evaluated from the inside out.",
        `First find g(${fmt(n)}). Then use that result as the input to f.`,
        `g(${fmt(n)}) = ${a}(${fmt(n)})${cterm(b)}. Now plug that number into f(x) = x²${cterm(c)}.`,
      ],
      explanation: `Inside first: g(${fmt(n)}) = ${a}(${fmt(n)})${cterm(b)} = ${fmt(g(n))}\nThen f(${fmt(g(n))}) = (${fmt(g(n))})²${cterm(c)} = ${fmt(g(n) ** 2)}${cterm(c)} = ${fmt(ans)}`,
      takeaway: "f(g(x)): evaluate g first, then f. Order matters, f(g(x)) is usually different from g(f(x)).",
      check: (v) => approx(v, f(g(n))),
    };
  },
});

// ───────────────────────── Problem-Solving and Data Analysis ─────────────────────────

add({
  id: "ratio-proportion", skill: "ratios-rates", domain: "PSDA", difficulty: 1, expectedSec: 50, count: 6,
  gen(r) {
    const a = randInt(r, 2, 6), b = randInt(r, 2, 9), k = randInt(r, 2, 6);
    if (a === b) return null;
    const ctx = pick(r, [["cups of flour", "batches of cookies"], ["liters of paint", "walls"], ["teaspoons of salt", "servings of soup"]] as const);
    return {
      stem: `A recipe uses ${a} ${ctx[0]} for every ${b} ${ctx[1]}. At this rate, how many ${ctx[0]} are needed for ${b * k} ${ctx[1]}?`,
      correct: a * k,
      correctRationale: `${b * k} is ${k} times ${b}, so multiply ${a} by ${k}.`,
      distractors: [
        { value: (b * b * k) / a, rationale: "This sets up the proportion upside down.", trap: "concept" },
        { value: a + (b * k - b), rationale: "This adds the difference instead of scaling by a factor (additive vs. multiplicative reasoning).", trap: "concept" },
        { value: b * k * a, rationale: `This multiplies by ${b * k} without dividing by ${b}.`, trap: "calculation" },
      ],
      hints: [
        "Keep the units in the same positions on both sides of a proportion.",
        `Set up ${a}/${b} = x/${b * k}.`,
        `How many times larger is ${b * k} than ${b}? Scale ${a} by the same factor.`,
      ],
      explanation: `${a} / ${b} = x / ${b * k}\nx = ${a} × ${b * k} / ${b} = ${a * k}`,
      takeaway: "Proportions scale multiplicatively. Write units next to each number to keep the setup consistent.",
      check: (v) => approx(v / (b * k), a / b),
    };
  },
});

add({
  id: "unit-convert", skill: "ratios-rates", domain: "PSDA", difficulty: 2, expectedSec: 70, count: 5,
  gen(r) {
    const mps = randInt(r, 2, 12) * 5; // meters per second
    const kph = (mps * 3600) / 1000;
    return {
      stem: `An object travels at a constant speed of ${mps} meters per second. What is this speed in kilometers per hour? (1 kilometer = 1,000 meters)`,
      correct: kph,
      correctRationale: `${mps} m/s × 3,600 s/h ÷ 1,000 m/km = ${fmt(kph)} km/h.`,
      distractors: [
        { value: (mps * 60) / 1000, rationale: "This converts seconds to minutes, not hours.", trap: "formula" },
        { value: (mps * 1000) / 3600, rationale: "This inverts both conversion factors.", trap: "concept" },
        { value: mps * 3600, rationale: "This converts to meters per hour but never to kilometers.", trap: "misread" },
      ],
      hints: [
        "Convert one unit at a time and let units cancel.",
        "There are 3,600 seconds in an hour and 1,000 meters in a kilometer.",
        `Multiply ${mps} m/s by 3,600 s/h, then divide by 1,000 m/km.`,
      ],
      explanation: `${mps} m/s × (3,600 s / 1 h) = ${mps * 3600} m/h\n${mps * 3600} m/h × (1 km / 1,000 m) = ${fmt(kph)} km/h`,
      takeaway: "Use dimensional analysis: multiply by conversion fractions arranged so unwanted units cancel.",
      check: (v) => approx((v * 1000) / 3600, mps),
    };
  },
});

add({
  id: "pct-change-twice", skill: "percentages", domain: "PSDA", difficulty: 3, expectedSec: 80, count: 6,
  gen(r) {
    const up = pick(r, [10, 20, 25, 30, 40, 50]), down = pick(r, [10, 20, 25, 30, 40, 50]);
    const net = (1 + up / 100) * (1 - down / 100);
    const pct = Math.round((net - 1) * 10000) / 100;
    if (pct === 0) return null;
    return {
      stem: `The price of a jacket was increased by ${up}%. Later, the new price was decreased by ${down}%. The final price is what percent of the original price?`,
      correct: Math.round(net * 10000) / 100,
      correctRationale: `Multiply the factors: ${1 + up / 100} × ${1 - down / 100} = ${fmt(net)}, which is ${fmt(Math.round(net * 10000) / 100)}%.`,
      distractors: [
        { value: 100 + up - down, rationale: "Percent changes can't be added; the second change applies to the new price, not the original.", trap: "concept" },
        { value: (1 + up / 100) * (down / 100) * 100, rationale: "This finds the size of the discount instead of the remaining price.", trap: "misread" },
        { value: Math.round((net - 1) * 10000) / 100, rationale: "This is the overall percent change, not the final price as a percent of the original.", trap: "misread" },
      ],
      show: (v) => `${fmt(v)}%`,
      hints: [
        "The second percent change is applied to a different base than the first.",
        "Convert each change to a multiplier: an increase of p% is ×(1 + p/100), a decrease is ×(1 − p/100).",
        `Multiply ${1 + up / 100} by ${1 - down / 100}, then express the result as a percent.`,
      ],
      explanation: `Increase by ${up}%: ×${1 + up / 100}\nDecrease by ${down}%: ×${1 - down / 100}\nOverall: ${1 + up / 100} × ${1 - down / 100} = ${fmt(net)}\nSo the final price is ${fmt(Math.round(net * 10000) / 100)}% of the original.\nTip: try an original price of $100 to check.`,
      takeaway: "Successive percent changes multiply. Plugging in 100 as the starting value makes these fast and safe.",
      check: (v) => approx(v / 100, net, 1e-6),
    };
  },
});

add({
  id: "pct-original", skill: "percentages", domain: "PSDA", difficulty: 2, expectedSec: 60, count: 6,
  gen(r) {
    const orig = randInt(r, 4, 30) * 10, off = pick(r, [10, 15, 20, 25, 30, 40]);
    const sale = orig * (1 - off / 100);
    if (!Number.isInteger(sale)) return null;
    return {
      stem: `After a ${off}% discount, the sale price of a bicycle is $${sale}. What was the original price, in dollars?`,
      correct: orig,
      correctRationale: `The sale price is ${100 - off}% of the original: ${(100 - off) / 100}p = ${sale}, so p = ${orig}.`,
      sprTraps: [{ value: sale * (1 + off / 100), rationale: `Adding ${off}% of the sale price back does not undo a ${off}% discount, because the discount was a percent of the original.`, trap: "concept" }],
      hints: [
        "The discount was taken from the original price, which is unknown.",
        `If ${off}% was taken off, the sale price is ${100 - off}% of the original.`,
        `Solve ${(100 - off) / 100} × p = ${sale} for p.`,
      ],
      explanation: `Sale price = (1 − ${off / 100}) × original\n${sale} = ${(100 - off) / 100} × p\np = ${sale} ÷ ${(100 - off) / 100} = ${orig}`,
      takeaway: "To reverse a percent change, divide by the multiplier. Don't add the percent back on.",
      check: (v) => approx(v * (1 - off / 100), sale),
    };
  },
});

add({
  id: "mean-add", skill: "one-var-data", domain: "PSDA", difficulty: 2, expectedSec: 70, count: 6,
  gen(r) {
    const n = randInt(r, 4, 9), mean = randInt(r, 70, 90), newMean = mean + pick(r, [-2, -1, 1, 2, 3]);
    const x = newMean * (n + 1) - mean * n;
    if (x < 40 || x > 100) return null;
    return {
      stem: `The mean score of ${n} tests is ${mean}. After one more test, the mean of all ${n + 1} tests is ${newMean}. What was the score on the last test?`,
      correct: x,
      correctRationale: `Total before: ${n}·${mean} = ${n * mean}. Total after: ${n + 1}·${newMean} = ${(n + 1) * newMean}. The difference is ${x}.`,
      distractors: [
        { value: newMean + (newMean - mean), rationale: "This assumes the new score shifts the mean by the same amount it differs from the mean, ignoring how many tests there are.", trap: "concept" },
        { value: mean + n * (newMean - mean), rationale: "This builds the score from the old mean; the new test raises (or lowers) the new mean too, so it must be added to the new mean.", trap: "calculation" },
        { value: newMean, rationale: "This assumes the new score equals the new mean.", trap: "concept" },
      ],
      hints: [
        "Work with totals instead of means.",
        "Mean × number of values = total. Find the total before and after.",
        `Before: ${n} × ${mean}. After: ${n + 1} × ${newMean}. The last test score is the difference.`,
      ],
      explanation: `Sum of the first ${n}: ${n} × ${mean} = ${n * mean}\nSum of all ${n + 1}: ${n + 1} × ${newMean} = ${(n + 1) * newMean}\nLast score = ${(n + 1) * newMean} − ${n * mean} = ${x}`,
      takeaway: "Mean problems are almost always easiest through sums: sum = mean × count.",
      check: (v) => approx((n * mean + v) / (n + 1), newMean),
    };
  },
});

add({
  id: "median-list", skill: "one-var-data", domain: "PSDA", difficulty: 1, expectedSec: 45, count: 5,
  gen(r) {
    const len = pick(r, [6, 7, 8]);
    const vals = Array.from({ length: len }, () => randInt(r, 2, 40));
    const sorted = [...vals].sort((a, b) => a - b);
    const med = len % 2 ? sorted[(len - 1) / 2] : (sorted[len / 2 - 1] + sorted[len / 2]) / 2;
    const mean = vals.reduce((s, v) => s + v, 0) / len;
    const unsortedMid = len % 2 ? vals[(len - 1) / 2] : (vals[len / 2 - 1] + vals[len / 2]) / 2;
    if (approx(mean, med) || approx(unsortedMid, med)) return null;
    return {
      stem: `The data set below lists the number of minutes ${len} students spent reading yesterday.\n\n${vals.join(", ")}\n\nWhat is the median of the data set?`,
      correct: med,
      correctRationale: `Sorted: ${sorted.join(", ")}. The middle value${len % 2 ? " is" : "s average to"} ${fmt(med)}.`,
      distractors: [
        { value: unsortedMid, rationale: "This takes the middle of the list without sorting it first.", trap: "concept" },
        { value: Math.round(mean * 100) / 100, rationale: "This is the mean, not the median.", trap: "concept" },
        { value: sorted[len - 1] - sorted[0], rationale: "This is the range, not the median.", trap: "concept" },
      ],
      hints: [
        "The median is the middle value of an ordered list.",
        "Sort the values from least to greatest first.",
        len % 2 ? "With an odd number of values, the median is the one exactly in the middle." : "With an even number of values, average the two middle values.",
      ],
      explanation: `Sorted: ${sorted.join(", ")}\n${len % 2 ? `The middle (${(len + 1) / 2}th) value is ${fmt(med)}.` : `The two middle values are ${sorted[len / 2 - 1]} and ${sorted[len / 2]}; their average is ${fmt(med)}.`}`,
      takeaway: "Always sort before finding a median. Even count → average the two middle values.",
      check: (v) => approx(v, med),
    };
  },
});

add({
  id: "best-fit", skill: "two-var-data", domain: "PSDA", difficulty: 1, expectedSec: 50, count: 5,
  gen(r) {
    const m = pick(r, [1.5, 2.5, 3.2, 4, 0.8]), b = randInt(r, 5, 40), x = randInt(r, 5, 20);
    const y = Math.round((m * x + b) * 100) / 100;
    return {
      stem: `A scatterplot shows the relationship between hours studied, x, and quiz score improvement, y, for a group of students. The line of best fit is y = ${m}x + ${b}. Based on the line of best fit, what is the predicted y-value when x = ${x}?`,
      correct: y,
      correctRationale: `y = ${m}(${x}) + ${b} = ${fmt(y)}.`,
      distractors: [
        { value: Math.round(((x - b) / m) * 100) / 100, rationale: `This solves for x when y = ${x}, the reverse question.`, trap: "misread" },
        { value: m * x, rationale: "This leaves out the y-intercept.", trap: "calculation" },
        { value: Math.round(m * (x + b) * 100) / 100, rationale: "This adds before multiplying.", trap: "calculation" },
      ],
      hints: [
        "A line of best fit makes predictions by substitution.",
        `Substitute x = ${x} into the equation.`,
        `Compute ${m} × ${x}, then add ${b}.`,
      ],
      explanation: `y = ${m}(${x}) + ${b} = ${fmt(m * x)} + ${b} = ${fmt(y)}`,
      takeaway: "Predictions from a line of best fit are estimates, not guaranteed values. The slope gives the predicted change in y per 1-unit increase in x.",
      check: (v) => approx(v, m * x + b, 1e-6),
    };
  },
});

add({
  id: "prob-table", skill: "probability", domain: "PSDA", difficulty: 2, expectedSec: 75, count: 6,
  gen(r) {
    const a = randInt(r, 10, 40), b = randInt(r, 10, 40), c = randInt(r, 10, 40), d = randInt(r, 10, 40);
    const p = a / (a + c);
    const totalP = a / (a + b + c + d);
    if (approx(p, a / (a + b))) return null;
    return {
      stem: "The table below summarizes a survey of students about whether they play a sport and whether they play an instrument. If one student who plays a sport is selected at random, what is the probability that the student also plays an instrument?",
      table: {
        headers: ["", "Instrument", "No instrument", "Total"],
        rows: [
          ["Sport", a, c, a + c],
          ["No sport", b, d, b + d],
          ["Total", a + b, c + d, a + b + c + d],
        ],
      },
      correct: p,
      correctRationale: `Restrict to students who play a sport (${a + c}). Of those, ${a} play an instrument: ${a}/${a + c}.`,
      distractors: [
        { value: totalP, rationale: "This divides by the total of all students instead of only those who play a sport.", trap: "misread" },
        { value: a / (a + b), rationale: "This divides by the instrument total, which answers a different conditional question.", trap: "concept" },
        { value: (a + c) / (a + b + c + d), rationale: "This is the probability that a random student plays a sport.", trap: "misread" },
      ],
      hints: [
        "The phrase 'one student who plays a sport' changes which group you are choosing from.",
        "For conditional probability, the denominator is the size of the given group.",
        `Use the 'Sport' row only. The denominator is ${a + c}.`,
      ],
      explanation: `Given group: students who play a sport → row total ${a + c}.\nOf those, ${a} play an instrument.\nP = ${a}/${a + c} = ${fmt(p)}`,
      takeaway: "In 'given that' or 'who…' probability questions, the denominator is the total of the condition group, not the grand total.",
      check: (v) => approx(v, a / (a + c)),
    };
  },
});

// ───────────────────────── Geometry and Trigonometry ─────────────────────────

add({
  id: "cyl-volume", skill: "area-volume", domain: "GEO", difficulty: 2, expectedSec: 60, count: 5,
  gen(r) {
    const rad = randInt(r, 2, 8), h = randInt(r, 3, 12);
    const k = rad * rad * h;
    return {
      stem: `A right circular cylinder has a radius of ${rad} centimeters and a height of ${h} centimeters. The volume of the cylinder is kπ cubic centimeters. What is the value of k?`,
      correct: k,
      correctRationale: `V = πr²h = π(${rad})²(${h}) = ${k}π.`,
      distractors: [
        { value: 2 * rad * h, rationale: "This uses 2rh, part of the lateral area formula, instead of r²h.", trap: "formula" },
        { value: rad * h, rationale: "This forgets to square the radius.", trap: "formula" },
        { value: 4 * rad * rad * h, rationale: "This uses the diameter in place of the radius.", trap: "misread" },
      ],
      hints: [
        "The SAT reference sheet lists the cylinder volume formula.",
        "V = πr²h. Which numbers are r and h?",
        `Compute ${rad}² × ${h}; that number multiplies π.`,
      ],
      explanation: `V = πr²h = π × ${rad}² × ${h} = π × ${rad * rad} × ${h} = ${k}π\nSo k = ${k}.`,
      takeaway: "Use the reference sheet: it's available on test day. Watch for radius vs. diameter.",
      check: (v) => approx(v * Math.PI, Math.PI * rad * rad * h),
    };
  },
});

add({
  id: "scale-area", skill: "area-volume", domain: "GEO", difficulty: 3, expectedSec: 60, count: 4,
  gen(r) {
    const s = pick(r, [2, 3, 4, 5]), solid = pick(r, [true, false]);
    const factor = solid ? s ** 3 : s ** 2;
    return {
      stem: solid
        ? `Each edge of a cube is multiplied by ${s}. The volume of the new cube is how many times the volume of the original cube?`
        : `Each side length of a square is multiplied by ${s}. The area of the new square is how many times the area of the original square?`,
      correct: factor,
      correctRationale: solid ? `Volume scales with the cube of the length factor: ${s}³ = ${factor}.` : `Area scales with the square of the length factor: ${s}² = ${factor}.`,
      distractors: [
        { value: s, rationale: "This assumes the measurement scales by the same factor as the length.", trap: "concept" },
        { value: solid ? s * s : s * s * s, rationale: solid ? "This is how area scales, but volume is three-dimensional." : "This is how volume scales, but area is two-dimensional.", trap: "formula" },
        { value: 2 * s, rationale: "This doubles the factor, which has no geometric basis.", trap: "concept" },
      ],
      hints: [
        "Try it with an actual number: start with a side of 1.",
        solid ? "Volume of a cube = side³." : "Area of a square = side².",
        `If the side goes from 1 to ${s}, compute the new ${solid ? "volume" : "area"}.`,
      ],
      explanation: solid
        ? `Original volume: 1³ = 1. New: ${s}³ = ${factor}. Ratio = ${factor}.`
        : `Original area: 1² = 1. New: ${s}² = ${factor}. Ratio = ${factor}.`,
      takeaway: "Scale factor k for length → k² for area, k³ for volume.",
      check: (v) => approx(v, solid ? s ** 3 : s ** 2),
    };
  },
});

add({
  id: "triangle-angles", skill: "lines-angles-triangles", domain: "GEO", difficulty: 1, expectedSec: 45, count: 5,
  gen(r) {
    const a = randInt(r, 25, 80), b = randInt(r, 25, 80);
    const c = 180 - a - b;
    if (c < 10) return null;
    return {
      stem: `In triangle ABC, the measure of angle A is ${a}° and the measure of angle B is ${b}°. What is the measure, in degrees, of the exterior angle at C (the angle formed by extending side BC past C)?`,
      correct: a + b,
      correctRationale: `The exterior angle equals the sum of the two remote interior angles: ${a} + ${b} = ${a + b}°.`,
      distractors: [
        { value: c, rationale: "This is the interior angle at C, not the exterior angle.", trap: "misread" },
        { value: 360 - a - b, rationale: "This subtracts from 360 instead of using a straight angle (180°).", trap: "formula" },
        { value: Math.abs(a - b), rationale: "This is the difference of the remote angles, not the sum.", trap: "concept" },
      ],
      hints: [
        "An exterior angle and its adjacent interior angle form a straight line.",
        "First find the interior angle at C using the triangle sum of 180°.",
        `Interior C = 180 − ${a} − ${b} = ${c}. The exterior angle is 180 minus that.`,
      ],
      explanation: `Interior angle C = 180° − ${a}° − ${b}° = ${c}°\nExterior angle at C = 180° − ${c}° = ${a + b}°\n(Shortcut: exterior angle = sum of the two remote interior angles.)`,
      takeaway: "Triangle angles sum to 180°. An exterior angle equals the sum of the two non-adjacent interior angles.",
      check: (v) => approx(v + (180 - a - b), 180),
    };
  },
});

add({
  id: "pythag", skill: "right-triangles-trig", domain: "GEO", difficulty: 2, expectedSec: 60, count: 6,
  gen(r) {
    const [p, q, h] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]] as const);
    const k = randInt(r, 1, 4);
    const askLeg = r() < 0.5;
    const A = p * k, B = q * k, C = h * k;
    return {
      stem: askLeg
        ? `A right triangle has a hypotenuse of length ${C} and one leg of length ${A}. What is the length of the other leg?`
        : `A right triangle has legs of length ${A} and ${B}. What is the length of the hypotenuse?`,
      correct: askLeg ? B : C,
      correctRationale: askLeg ? `b = √(${C}² − ${A}²) = √${C * C - A * A} = ${B}.` : `c = √(${A}² + ${B}²) = √${A * A + B * B} = ${C}.`,
      distractors: askLeg
        ? [
            { value: Math.round(Math.sqrt(C * C + A * A) * 100) / 100, rationale: "This adds the squares, but the hypotenuse is already known, so you subtract.", trap: "formula" },
            { value: C - A, rationale: "Side lengths don't subtract directly; their squares do.", trap: "concept" },
            { value: C * C - A * A, rationale: "This forgets to take the square root.", trap: "calculation" },
          ]
        : [
            { value: A + B, rationale: "Side lengths don't add directly; their squares do.", trap: "concept" },
            { value: A * A + B * B, rationale: "This forgets to take the square root.", trap: "calculation" },
            { value: Math.round(Math.sqrt(Math.abs(B * B - A * A)) * 100) / 100, rationale: "This subtracts squares, which is for finding a leg, not the hypotenuse.", trap: "formula" },
          ],
      hints: [
        "Right triangle with two known sides → Pythagorean theorem.",
        "a² + b² = c², where c is the hypotenuse (the side opposite the right angle).",
        askLeg ? `Solve ${A}² + b² = ${C}². Notice anything about ${A} and ${C}? (Common triples help.)` : `Compute ${A}² + ${B}², then take the square root. Is this a multiple of a common triple?`,
      ],
      explanation: askLeg
        ? `${A}² + b² = ${C}²\n${A * A} + b² = ${C * C}\nb² = ${C * C - A * A}\nb = ${B}\n(This is the ${p}-${q}-${h} triple scaled by ${k}.)`
        : `c² = ${A}² + ${B}² = ${A * A} + ${B * B} = ${C * C}\nc = ${C}\n(This is the ${p}-${q}-${h} triple scaled by ${k}.)`,
      takeaway: "Memorize common triples (3-4-5, 5-12-13, 8-15-17, 7-24-25) and their multiples to skip the arithmetic.",
      check: (v) => (askLeg ? approx(A * A + v * v, C * C) : approx(A * A + B * B, v * v)),
    };
  },
});

add({
  id: "trig-ratio", skill: "right-triangles-trig", domain: "GEO", difficulty: 2, expectedSec: 60, count: 6,
  gen(r) {
    const [p, q, h] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]] as const);
    const fn = pick(r, ["sin", "cos", "tan"] as const);
    const val = fn === "sin" ? p / h : fn === "cos" ? q / h : p / q;
    return {
      stem: `In right triangle PQR, angle R is the right angle. The side opposite angle P has length ${p}, the side adjacent to angle P has length ${q}, and the hypotenuse has length ${h}. What is the value of ${fn}(P)?`,
      correct: val,
      correctRationale: fn === "sin" ? `sin = opposite/hypotenuse = ${p}/${h}.` : fn === "cos" ? `cos = adjacent/hypotenuse = ${q}/${h}.` : `tan = opposite/adjacent = ${p}/${q}.`,
      distractors: [
        { value: fn === "sin" ? q / h : fn === "cos" ? p / h : q / p, rationale: fn === "tan" ? "This is adjacent/opposite, the reciprocal of tangent." : `This uses the wrong leg: it is ${fn === "sin" ? "cos" : "sin"}(P).`, trap: "formula" },
        { value: fn === "tan" ? p / h : h / (fn === "sin" ? p : q), rationale: fn === "tan" ? "This is sin(P), opposite/hypotenuse." : "This is the reciprocal of the correct ratio.", trap: "formula" },
        { value: fn === "tan" ? q / h : fn === "sin" ? p / q : q / p, rationale: "This uses the two legs or the wrong pair of sides.", trap: "formula" },
      ],
      hints: [
        "Remember SOH-CAH-TOA.",
        `${fn} uses ${fn === "sin" ? "opposite and hypotenuse" : fn === "cos" ? "adjacent and hypotenuse" : "opposite and adjacent"}.`,
        "Identify which side is opposite angle P and which is adjacent, relative to P (not R).",
      ],
      explanation: `SOH-CAH-TOA relative to angle P:\nopposite = ${p}, adjacent = ${q}, hypotenuse = ${h}\n${fn}(P) = ${fn === "sin" ? `${p}/${h}` : fn === "cos" ? `${q}/${h}` : `${p}/${q}`}`,
      takeaway: "SOH-CAH-TOA. Also: sin(x°) = cos(90° − x°) for complementary angles, which is a common SAT question.",
      check: (v) => approx(v, val),
    };
  },
});

add({
  id: "circle-radius", skill: "circles", domain: "GEO", difficulty: 3, expectedSec: 100, count: 6,
  gen(r) {
    const h = randInt(r, -6, 6), k = randInt(r, -6, 6), rad = randInt(r, 2, 9);
    if (h === 0 || k === 0) return null;
    const D = -2 * h, E = -2 * k, F = h * h + k * k - rad * rad;
    return {
      stem: `The equation of a circle in the xy-plane is x² + y²${term(D)}${term(E, "y")}${cterm(F)} = 0. What is the radius of the circle?`,
      correct: rad,
      correctRationale: `Completing the square gives (x${cterm(-h)})² + (y${cterm(-k)})² = ${rad * rad}, so r = ${rad}.`,
      distractors: [
        { value: rad * rad, rationale: "This is r², not r. The right side of the standard form equals the radius squared.", trap: "formula" },
        { value: Math.round(Math.sqrt(Math.abs(F)) * 100) / 100 === rad ? rad + 1 : Math.round(Math.sqrt(Math.abs(F)) * 100) / 100, rationale: "This takes the square root of the constant term without completing the square.", trap: "concept" },
        { value: Math.abs(h) + Math.abs(k) === rad ? rad + 2 : Math.abs(h) + Math.abs(k), rationale: "This combines the center's coordinates, which describe the center, not the size.", trap: "concept" },
      ],
      hints: [
        "Rewrite the equation in the form (x − h)² + (y − k)² = r².",
        "Complete the square for the x-terms and the y-terms separately.",
        `For x² ${D < 0 ? "−" : "+"} ${Math.abs(D)}x, add (${Math.abs(D)}/2)² = ${h * h}. For the y-terms, add ${k * k}. Add the same amounts to the other side.`,
      ],
      explanation: `x²${term(D)} + y²${term(E, "y")} = ${fmt(-F)}\nComplete the square: (x²${term(D)} + ${h * h}) + (y²${term(E, "y")} + ${k * k}) = ${fmt(-F)} + ${h * h} + ${k * k}\n(x${cterm(-h)})² + (y${cterm(-k)})² = ${rad * rad}\nr² = ${rad * rad}, so r = ${rad}.`,
      takeaway: "Circle: (x − h)² + (y − k)² = r². Complete the square on each variable; the right side is r², not r. Desmos can graph the original equation directly so you can read the radius.",
      check: (v) => v > 0 && approx(v * v, h * h + k * k - F),
    };
  },
});

add({
  id: "arc-length", skill: "circles", domain: "GEO", difficulty: 2, expectedSec: 70, count: 5,
  gen(r) {
    const rad = randInt(r, 3, 12), deg = pick(r, [30, 45, 60, 90, 120, 150]);
    const k = (2 * rad * deg) / 360; // arc = kπ
    return {
      stem: `A circle has a radius of ${rad}. What is the length of an arc of the circle that is intercepted by a central angle of ${deg}°? The answer can be written as kπ. What is k?`,
      correct: k,
      correctRationale: `Arc = (${deg}/360) × 2π(${rad}) = ${fmt(k)}π.`,
      distractors: [
        { value: (rad * rad * deg) / 360, rationale: "This is the coefficient of the sector's area, not the arc length.", trap: "formula" },
        { value: 2 * rad, rationale: "This is the full circumference coefficient; it wasn't scaled by the angle fraction.", trap: "concept" },
        { value: (rad * deg) / 360, rationale: "This uses πr instead of 2πr for the circumference.", trap: "formula" },
      ],
      hints: [
        "An arc is a fraction of the circumference.",
        "What fraction of 360° is the central angle?",
        `Multiply ${deg}/360 by the circumference 2π(${rad}).`,
      ],
      explanation: `Circumference = 2π(${rad}) = ${2 * rad}π\nFraction of circle = ${deg}/360 = ${fmt(deg / 360)}\nArc length = ${fmt(deg / 360)} × ${2 * rad}π = ${fmt(k)}π`,
      takeaway: "Arc length = (angle/360) × 2πr. Sector area = (angle/360) × πr².",
      check: (v) => approx(v * Math.PI, (deg / 360) * 2 * Math.PI * rad),
    };
  },
});

// ───────────────────────── Build ─────────────────────────

function buildFromTemplate(t: Template): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let attempt = 0;
  while (out.length < t.count && attempt < t.count * 40) {
    const rng = mulberry32(hashString(`${t.id}#${attempt}`));
    attempt++;
    const inst = t.gen(rng);
    if (!inst) continue;
    if (!inst.hints.every(Boolean)) continue;
    const key = inst.stem + JSON.stringify(inst.table ?? "");
    if (seen.has(key)) continue;
    const id = `m-${t.id}-${attempt}`;
    const base = {
      id, section: "MATH" as const, domain: t.domain, skill: t.skill, difficulty: t.difficulty,
      expectedSec: t.expectedSec, stem: inst.stem, hints: inst.hints, explanation: inst.explanation,
      takeaway: inst.takeaway, verification: "computed" as const, template: t.id, check: inst.check, table: inst.table,
    };
    if (inst.distractors) {
      if (inst.distractors.length !== 3) continue;
      const show = inst.show ?? fmt;
      const opts = [
        { value: inst.correct, display: inst.correctDisplay ?? show(inst.correct), rationale: inst.correctRationale, trap: undefined as MistakeCategory | undefined, ok: true },
        ...inst.distractors.map((d) => ({ value: d.value, display: d.display ?? show(d.value), rationale: d.rationale, trap: d.trap, ok: false })),
      ];
      if (opts.some((o) => !Number.isFinite(o.value))) continue;
      // Reject instances where a distractor coincides with the answer or another distractor.
      if (new Set(opts.map((o) => o.display)).size !== 4) continue;
      const order = shuffle(rng, opts);
      const answerIdx = order.findIndex((o) => o.ok);
      out.push({
        ...base, type: "mcq",
        choices: order.map((o) => ({ text: o.display, rationale: o.rationale, trap: o.trap })) as [Choice, Choice, Choice, Choice],
        answer: "ABCD"[answerIdx] as Letter,
        numericChoices: order.map((o) => o.value) as [number, number, number, number],
      });
    } else {
      const traps = (inst.sprTraps ?? []).filter((d) => Number.isFinite(d.value) && !approx(d.value, inst.correct));
      out.push({
        ...base, type: "spr", accepted: [inst.correct], answerDisplay: fmt(inst.correct),
        traps: traps.map((d) => ({ value: d.value, rationale: d.rationale, trap: d.trap })),
      });
    }
    // Resample any instance that fails the quality gate (e.g. a hint that happens to contain the answer).
    if (validateQuestion(out[out.length - 1]).length) {
      out.pop();
      continue;
    }
    seen.add(key);
  }
  return out;
}

export const MATH_TEMPLATES = T;
export function buildMathQuestions(): Question[] {
  return T.flatMap(buildFromTemplate);
}
