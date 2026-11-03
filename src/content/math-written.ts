import type { Choice, Difficulty, Letter, MCQuestion } from "./types";
import { skillById, type MistakeCategory } from "./taxonomy";

// Hand-written math questions for skills that are conceptual rather than computational.
// Where a numeric answer exists, `check` and `numericChoices` let the validator verify it.

type C = [string, string, MistakeCategory?];
function m(s: {
  id: string; skill: string; difficulty: Difficulty; sec: number; stem: string; choices: [C, C, C, C]; answer: Letter;
  hints: [string, string, string]; explanation: string; takeaway: string; table?: MCQuestion["table"];
  numeric?: [number, number, number, number]; check?: (v: number) => boolean;
}): MCQuestion {
  const sk = skillById.get(s.skill)!;
  return {
    id: s.id, type: "mcq", section: "MATH", domain: sk.domain, skill: s.skill, difficulty: s.difficulty,
    expectedSec: s.sec, stem: s.stem, table: s.table,
    choices: s.choices.map(([text, rationale, trap]) => ({ text, rationale, trap })) as [Choice, Choice, Choice, Choice],
    answer: s.answer, hints: s.hints, explanation: s.explanation, takeaway: s.takeaway,
    verification: s.check ? "computed" : "reviewed", numericChoices: s.numeric, check: s.check,
  };
}

export const MATH_WRITTEN: MCQuestion[] = [
  m({
    id: "mw-stats-1", skill: "inference-stats", difficulty: 2, sec: 70,
    stem: "A researcher wants to estimate the average number of hours per week that students at a large high school spend on homework. Which sampling method would produce the most reliable estimate?",
    choices: [
      ["Surveying 100 students selected at random from a list of all students at the school", "Correct. A random sample from the whole population avoids systematic bias, so its average is a reliable estimate."],
      ["Surveying all 100 students who are members of the honors society", "Honors students likely spend more time on homework than average, which biases the estimate.", "concept"],
      ["Surveying the first 100 students who arrive at the library after school", "Students who go to the library after school may do more homework than others. This is a convenience sample.", "concept"],
      ["Posting an online survey and using the first 100 responses", "Volunteers who choose to respond may differ from typical students. This is a self-selected sample.", "concept"],
    ],
    answer: "A",
    hints: [
      "Think about which groups might not represent the whole school.",
      "A reliable sample must be chosen in a way that doesn't favor any particular type of student.",
      "Which method gives every student an equal chance of being picked?",
    ],
    explanation: "Only random selection from the entire student body avoids bias. Honors students, library visitors, and online volunteers are each likely to differ systematically from the average student.",
    takeaway: "Random sampling from the population → results generalize to that population. Convenience or volunteer samples are biased.",
  }),
  m({
    id: "mw-stats-2", skill: "inference-stats", difficulty: 3, sec: 80,
    stem: "In a study, 400 volunteers were randomly assigned to either drink green tea daily or drink water daily for six months. The green tea group showed a significantly greater decrease in blood pressure. Which conclusion is best supported?",
    choices: [
      ["Drinking green tea daily causes a decrease in blood pressure for all adults.", "Volunteers are not a random sample of all adults, so results can't be generalized to everyone.", "concept"],
      ["Drinking green tea daily is likely to cause a greater decrease in blood pressure than drinking water, for people similar to the volunteers.", "Correct. Random assignment supports a cause-and-effect conclusion, but because participants were volunteers, it applies to people like them."],
      ["There is an association between green tea and blood pressure, but no cause-and-effect conclusion can be drawn.", "Random assignment to treatments DOES allow a causal conclusion.", "concept"],
      ["Green tea lowers blood pressure more than any other drink.", "Only green tea and water were compared.", "misread"],
    ],
    answer: "B",
    hints: [
      "There are two separate questions: can we say 'causes'? And who does it apply to?",
      "Random ASSIGNMENT to groups → cause and effect. Random SELECTION from a population → generalize to that population.",
      "Was there random assignment? Was there random selection from all adults?",
    ],
    explanation: "Random assignment means the groups differ only by treatment, so a causal conclusion is justified. But participants were volunteers (not randomly selected from all adults), so the conclusion applies to people similar to the volunteers.",
    takeaway: "Random assignment → causation. Random sampling → generalization. You need both to claim 'causes ___ for everyone.'",
  }),
  m({
    id: "mw-stats-3", skill: "inference-stats", difficulty: 2, sec: 60,
    stem: "Based on a random sample, a survey estimates that 62% of a town's residents support building a new park, with a margin of error of 4 percentage points. Which statement is the most appropriate conclusion?",
    choices: [
      ["Exactly 62% of residents support the park.", "A sample gives an estimate, not an exact value.", "concept"],
      ["It is plausible that between 58% and 66% of all residents support the park.", "Correct. The margin of error gives a plausible range: 62 ± 4."],
      ["Between 58% and 66% of the people surveyed support the park.", "Exactly 62% of those surveyed support it. The range is about the whole population.", "misread"],
      ["At least 66% of residents support the park.", "66% is the top of the plausible range, not a minimum.", "calculation"],
    ],
    answer: "B",
    hints: [
      "A margin of error creates a range around the estimate.",
      "Add and subtract 4 from 62.",
      "Does the range describe the sample or the whole town?",
    ],
    explanation: "62% ± 4% gives 58% to 66%. This interval is a plausible range for the true percentage in the whole population, not a statement about the sample.",
    takeaway: "Margin of error: estimate ± margin = plausible range for the POPULATION value. Larger samples → smaller margins.",
  }),
  m({
    id: "mw-trig-1", skill: "right-triangles-trig", difficulty: 3, sec: 60,
    stem: "In a right triangle, the two acute angles measure x° and y°. If sin(x°) = 0.6, what is the value of cos(y°)?",
    choices: [
      ["0.4", "This assumes the two values add to 1, which is not a trig identity.", "formula"],
      ["0.6", "Correct. x + y = 90, so cos(y°) = sin(90° − y°) = sin(x°) = 0.6."],
      ["0.8", "This is cos(x°), the cosine of the same angle, not of the complementary angle.", "concept"],
      ["1.6", "Trig ratios for acute angles are between 0 and 1.", "concept"],
    ],
    answer: "B",
    hints: [
      "What do the two acute angles of a right triangle add up to?",
      "Complementary angles have a special sine-cosine relationship.",
      "The side opposite x° is the side adjacent to y°.",
    ],
    explanation: "The acute angles of a right triangle are complementary: x + y = 90. The side opposite x is adjacent to y, so sin(x°) = cos(y°) = 0.6.",
    takeaway: "sin(θ) = cos(90° − θ). This identity appears on almost every SAT.",
    numeric: [0.4, 0.6, 0.8, 1.6], check: (v) => Math.abs(v - Math.cos(((90 - (Math.asin(0.6) * 180) / Math.PI) * Math.PI) / 180)) < 1e-9,
  }),
  m({
    id: "mw-lines-1", skill: "lines-angles-triangles", difficulty: 2, sec: 60,
    stem: "Two parallel lines are cut by a transversal. One of the angles formed measures 3x + 10 degrees, and its alternate interior angle measures 5x − 30 degrees. What is the value of x?",
    choices: [
      ["10", "This comes from adding the expressions and setting them equal to 180. Alternate interior angles are equal, not supplementary.", "concept"],
      ["20", "Correct. Alternate interior angles are equal: 3x + 10 = 5x − 30 → 40 = 2x → x = 20."],
      ["25", "Check: 3(25) + 10 = 85 and 5(25) − 30 = 95, which are not equal.", "calculation"],
      ["70", "70 is the angle measure, not x.", "misread"],
    ],
    answer: "B",
    hints: [
      "How are alternate interior angles related when lines are parallel?",
      "Alternate interior angles are congruent (equal).",
      "Set 3x + 10 = 5x − 30 and solve.",
    ],
    explanation: "With parallel lines, alternate interior angles are equal.\n3x + 10 = 5x − 30\n40 = 2x\nx = 20 (each angle measures 70°).",
    takeaway: "Parallel lines + transversal: alternate interior and corresponding angles are equal; same-side interior angles sum to 180°.",
    numeric: [10, 20, 25, 70], check: (v) => Math.abs(3 * v + 10 - (5 * v - 30)) < 1e-9,
  }),
  m({
    id: "mw-lines-2", skill: "lines-angles-triangles", difficulty: 3, sec: 80,
    stem: "Triangles ABC and DEF are similar, with angle A corresponding to angle D and angle B corresponding to angle E. If AB = 6, BC = 9, and DE = 10, what is the length of EF?",
    choices: [
      ["13", "This adds 4 (the difference DE − AB) to BC, but similar triangles scale by multiplying, not adding.", "concept"],
      ["5.4", "This sets up the ratio upside down.", "algebra"],
      ["15", "Correct. The scale factor is DE/AB = 10/6 = 5/3, so EF = 9 × 5/3 = 15."],
      ["60", "This multiplies DE by 6 without dividing.", "calculation"],
    ],
    answer: "C",
    hints: [
      "In similar triangles, corresponding sides are proportional.",
      "Find the scale factor from the pair of corresponding sides you know (AB and DE).",
      "BC corresponds to EF. Multiply BC by the scale factor.",
    ],
    explanation: "Scale factor = DE/AB = 10/6 = 5/3.\nEF corresponds to BC, so EF = 9 × 5/3 = 15.",
    takeaway: "Similar figures: corresponding sides share one scale factor. Scale multiplicatively, never additively.",
    numeric: [13, 5.4, 15, 60], check: (v) => Math.abs(v / 9 - 10 / 6) < 1e-9,
  }),
  m({
    id: "mw-2var-1", skill: "two-var-data", difficulty: 2, sec: 60,
    stem: "The line of best fit for a data set relating the age of a car, x, in years, to its resale value, y, in thousands of dollars, is y = −1.8x + 24. Which statement best interprets the slope?",
    choices: [
      ["A new car is predicted to be worth $24,000.", "That's the y-intercept (value at age 0), not the slope.", "misread"],
      ["For each additional year of age, the car's resale value is predicted to decrease by about $1,800.", "Correct. The slope −1.8 (thousands of dollars per year) means the value drops about $1,800 each year."],
      ["Each car loses exactly $1,800 per year.", "A line of best fit describes a predicted trend, not an exact amount for each car.", "concept"],
      ["After 1.8 years, the car is worth nothing.", "This misreads the slope as a time value.", "concept"],
    ],
    answer: "B",
    hints: [
      "Slope = change in y per 1-unit change in x.",
      "What are the units of x and y?",
      "y is in thousands of dollars. What does −1.8 mean in dollars per year?",
    ],
    explanation: "Slope −1.8 means y (thousands of dollars) decreases by 1.8 for each 1-year increase in x: about $1,800 per year. The 24 is the predicted value of a new car (the intercept). A best-fit line gives predictions, not exact values.",
    takeaway: "Slope interpretation: 'For each increase of 1 [x-unit], [y] is predicted to change by [slope] [y-units].' Check units carefully.",
  }),
  m({
    id: "mw-exp-1", skill: "nonlinear-functions", difficulty: 3, sec: 75,
    stem: "The function f(t) = 500(0.92)^t models the mass, in grams, of a substance t days after the start of an experiment. Which statement is the best interpretation of 0.92 in this context?",
    choices: [
      ["The mass decreases by 0.92 grams each day.", "Exponential models change by a percent, not a fixed amount.", "concept"],
      ["The mass decreases by 92% each day.", "Multiplying by 0.92 keeps 92%, so the decrease is 8%.", "concept"],
      ["Each day, the mass is 92% of what it was the previous day.", "Correct. Multiplying by 0.92 each day means 92% remains, an 8% daily decrease."],
      ["The initial mass of the substance is 0.92 grams.", "The initial mass is 500 g (when t = 0).", "misread"],
    ],
    answer: "C",
    hints: [
      "In a(b)^t, what do a and b represent?",
      "b is the multiplier applied each time period.",
      "If you multiply by 0.92, what percent of the mass remains?",
    ],
    explanation: "In f(t) = a·b^t, a is the initial value (500 g) and b is the per-period multiplier. b = 0.92 means 92% remains each day, which is an 8% decrease per day.",
    takeaway: "Growth/decay factor b: b > 1 grows by (b − 1)×100%, b < 1 decays by (1 − b)×100%.",
  }),
];
