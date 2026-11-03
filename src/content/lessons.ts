// Short concept lessons: one concept each, plain language first, then a worked example
// and the traps to avoid. Each lesson is linked to targeted practice for its skill.

export interface Lesson {
  id: string; // equals the skill id
  title: string;
  minutes: number;
  idea: string;
  steps: string[];
  example: { problem: string; solution: string };
  traps: string[];
}

export const LESSONS: Lesson[] = [
  // ── Reading and Writing
  {
    id: "central-ideas", title: "Finding the main idea", minutes: 4,
    idea: "The main idea is the one claim that the whole passage supports. Every detail should fit under it.",
    steps: ["Read the whole text before looking at the choices.", "Watch for a turn ('however', 'yet', 'in truth'). The author's point usually comes after it.", "Say the main idea in your own words in under 10 words.", "Eliminate choices that are too narrow (one detail), too broad, or that add outside information."],
    example: { problem: "A text says many people think cats are aloof, but studies show cats form attachments to owners similar to those of infants. Main idea?", solution: "Research suggests cats are more attached to their owners than their reputation implies. The 'but' marks the author's point." },
    traps: ["A true detail that isn't the main point", "A choice that repeats the view the author is correcting", "Extreme words (always, never, only) the text doesn't support"],
  },
  {
    id: "evidence-textual", title: "Supporting a claim with textual evidence", minutes: 4,
    idea: "Find the evidence that matches EVERY part of the claim, not just its topic.",
    steps: ["Underline the exact claim or hypothesis.", "Turn it into a prediction: 'If this is true, we'd see…'.", "Pick the choice that shows that prediction. For 'weaken', pick the choice that shows the opposite."],
    example: { problem: "Claim: plants grow taller with blue light than red light. Which finding supports it?", solution: "Plants under blue light averaged 12 cm and plants under red light averaged 8 cm. It compares both conditions on height." },
    traps: ["Right topic, wrong variable", "Supports only half of a two-part claim", "Choosing 'support' evidence on a 'weaken' question"],
  },
  {
    id: "evidence-quantitative", title: "Using data from tables and graphs", minutes: 5,
    idea: "The right choice must be (1) accurate to the data AND (2) relevant to the claim.",
    steps: ["Read the claim first, then the table title, labels, and units.", "Check every number in each choice against the table.", "Of the accurate choices, keep the one that supports the specific claim.", "Watch for words like 'only' and 'but not', which add a second requirement."],
    example: { problem: "Claim: sales rose every year. Table: 2020: 40, 2021: 55, 2022: 51.", solution: "The claim is not supported: 2022 dropped. A correct answer must show every year rising." },
    traps: ["Accurate data that doesn't address the claim", "Misreading units or the wrong row", "Comparing the wrong groups"],
  },
  {
    id: "inferences", title: "Making logical inferences", minutes: 4,
    idea: "Pick the conclusion that MUST follow from the text, the smallest logical step.",
    steps: ["Identify what is being compared or what changed.", "Ask: what does the text prove, not what might also be true?", "Prefer cautious, specific conclusions over big claims."],
    example: { problem: "Older soil layers have many seed fossils; newer layers have almost none. This suggests…", solution: "…the plant became less common in the area over time. Not why it declined, which the text doesn't show." },
    traps: ["Explaining WHY when the text only shows WHAT", "Contradicting a stated detail", "Using outside knowledge"],
  },
  {
    id: "words-in-context", title: "Words in context", minutes: 4,
    idea: "Predict the word from clues in the sentence before looking at the choices.",
    steps: ["Cover the choices. Find the clue (often after a colon, comma, or 'but').", "Decide if the blank is positive or negative, and how strong it is.", "Write your own word, then match it.", "Test the choice in the sentence. Beware of secondary meanings."],
    example: { problem: "Despite years of setbacks, the team remained ______, convinced success was near.", solution: "'Despite setbacks' plus 'convinced success was near' → 'optimistic' or 'undeterred'." },
    traps: ["A valid meaning of the word in a different context", "Right direction, wrong intensity", "Picking a word that just sounds sophisticated"],
  },
  {
    id: "text-structure", title: "Text structure and purpose", minutes: 4,
    idea: "Label what each sentence DOES: claim, evidence, example, counterpoint, or explanation.",
    steps: ["Give each sentence a 2–3 word job label.", "For purpose questions, pick the verb first (describe, argue, challenge, explain).", "For the function of a sentence, ask how it relates to the main claim."],
    example: { problem: "S1: common belief. S2: 'However, data show…'. S3: possible reason.", solution: "Structure: presents a belief, challenges it with evidence, offers an explanation." },
    traps: ["Right content in the wrong order", "Verb too strong ('proves', 'condemns')", "Describing only part of the text"],
  },
  {
    id: "cross-text", title: "Connecting two texts", minutes: 5,
    idea: "Summarize each text's claim in one line, then name the relationship.",
    steps: ["Text 1's claim in one line.", "Text 2's claim in one line.", "Relationship: agrees, disagrees, qualifies, adds a cause, or questions the method?", "Match the strength of the disagreement. 'Incomplete' is more common than 'wrong'."],
    example: { problem: "Text 1: A caused B. Text 2: studies of A had small samples and other factors.", solution: "Text 2 would say other factors may explain B, so the evidence is not conclusive." },
    traps: ["Overstating the disagreement", "Answering about the wrong text", "Attributing claims neither text makes"],
  },
  {
    id: "rhetorical-synthesis", title: "Rhetorical synthesis (notes questions)", minutes: 3,
    idea: "Read the GOAL first. The answer accomplishes exactly that goal. Accuracy alone isn't enough.",
    steps: ["Skip the notes and read the goal in the question.", "Underline the key words in the goal (contrast, explain why, emphasize, introduce to an audience).", "Eliminate choices that don't do that, even if they're accurate.", "Contrast or compare goals need BOTH items."],
    example: { problem: "Goal: emphasize a similarity between two species.", solution: "The answer must name both species and something they share. Words like 'both' or 'like' are a signal." },
    traps: ["Accurate but off-goal", "Only one half of a comparison", "Too much irrelevant detail"],
  },
  {
    id: "transitions", title: "Transitions", minutes: 3,
    idea: "Name the relationship between the sentences, then pick the word that signals it.",
    steps: ["Read the sentence before AND after the blank.", "Label: contrast, cause → effect, example, addition, similarity, sequence, or restatement.", "Pick the transition from that family."],
    example: { problem: "Bees pollinate many plants. ____, some plants rely on wind.", solution: "Contrast → 'However'." },
    traps: ["'Therefore' when events are only in sequence", "Time-order words when the key relationship is contrast", "'For example' when the second sentence isn't a specific case"],
  },
  {
    id: "boundaries", title: "Punctuation between clauses", minutes: 6,
    idea: "Know what can join two complete sentences (independent clauses) and what can't.",
    steps: ["Test each side: could it stand alone as a sentence?", "Two independent clauses: use a period, a semicolon, a colon (if the second explains the first), or a comma + FANBOYS.", "A comma alone between two independent clauses is a comma splice and is always wrong.", "Nonessential info takes matching punctuation on both sides (two commas or two dashes).", "No single comma between a subject and its verb."],
    example: { problem: "The lab closed early ___ the power was out.", solution: "Both sides are independent: '; ' or '. The' works. ', ' alone doesn't." },
    traps: ["'However' and 'therefore' are not FANBOYS", "Colon after an incomplete clause", "Mixing a comma with a dash around the same phrase"],
  },
  {
    id: "form-structure-sense", title: "Agreement, verbs, and modifiers", minutes: 6,
    idea: "Most questions test matching: subject–verb, pronoun–noun, modifier–noun, and parallel lists.",
    steps: ["Subject–verb: cross out prepositional phrases and interrupters to find the real subject.", "Pronouns: find the noun the pronoun refers to; match its number.", "Modifiers: an introductory phrase must be followed by the thing it describes.", "Tense: match the timeline ('by the time [past]' → 'had').", "Lists must be parallel."],
    example: { problem: "The box of old letters ____ (was/were) found in the attic.", solution: "Subject is 'box' (singular) → 'was'." },
    traps: ["Plural noun inside 'of…' phrase", "'Along with' / 'as well as' do NOT make a subject plural", "its / it's, their / there / they're"],
  },
  // ── Math
  {
    id: "linear-one-var", title: "Solving linear equations", minutes: 4,
    idea: "Undo operations in reverse order until x is alone. Whatever you do to one side, do to the other.",
    steps: ["Distribute and combine like terms.", "Move x-terms to one side and constants to the other.", "Divide by the coefficient.", "Special cases: same x-coefficient + different constants → no solution. Same both → infinitely many."],
    example: { problem: "3(x − 2) = x + 8", solution: "3x − 6 = x + 8 → 2x = 14 → x = 7" },
    traps: ["Distributing to only the first term", "Sign errors when moving terms", "Answering with 2x instead of x"],
  },
  {
    id: "linear-functions", title: "Linear functions and slope", minutes: 5,
    idea: "y = mx + b: m is the rate of change (slope), b is the starting value (y-intercept).",
    steps: ["Slope from two points: (y₂ − y₁)/(x₂ − x₁).", "Plug a point into y = mx + b to find b.", "In word problems, the coefficient is the 'per' rate and the constant is the fixed amount."],
    example: { problem: "A plan costs $20 plus $15 per month. Cost after n months?", solution: "C = 15n + 20" },
    traps: ["Run over rise instead of rise over run", "Confusing f(a) with solving f(x) = a", "Mixing up the slope and the intercept in context"],
  },
  {
    id: "linear-two-var", title: "Linear equations in two variables", minutes: 4,
    idea: "An equation like 3x + 5y = 60 describes all (x, y) combinations that work, like a budget.",
    steps: ["Plug in the known variable and solve for the other.", "Intercepts: set x = 0 to find the y-intercept, and y = 0 for the x-intercept.", "Coefficients are per-unit values (e.g., price each)."],
    example: { problem: "3x + 5y = 60, x = 10. Find y.", solution: "30 + 5y = 60 → y = 6" },
    traps: ["Plugging into the wrong variable", "Forgetting to multiply by the coefficient"],
  },
  {
    id: "systems", title: "Systems of linear equations", minutes: 5,
    idea: "The solution is the point that satisfies both equations, where the lines intersect.",
    steps: ["Elimination: scale equations so one variable cancels, then add or subtract.", "Substitution: solve one equation for a variable and plug into the other.", "Desmos: graph both and click the intersection.", "No solution = parallel (proportional coefficients, different constants). Infinitely many = same line."],
    example: { problem: "x + y = 10, x − y = 2", solution: "Add: 2x = 12 → x = 6, y = 4" },
    traps: ["Answering x when asked for x + y", "Arithmetic slips when scaling", "Confusing no solution with infinitely many solutions"],
  },
  {
    id: "linear-inequalities", title: "Linear inequalities", minutes: 4,
    idea: "Solve like an equation, but flip the sign when multiplying or dividing by a negative.",
    steps: ["Isolate the variable.", "Flip < / > if you multiply or divide by a negative.", "For 'greatest number of items' questions, round DOWN. For 'least needed', round UP.", "Check the boundary value and its neighbor."],
    example: { problem: "−2x + 5 > 11", solution: "−2x > 6 → x < −3 (flipped)" },
    traps: ["Forgetting to flip", "Rounding the wrong way in context"],
  },
  {
    id: "equivalent-expressions", title: "Equivalent expressions", minutes: 5,
    idea: "Expand, factor, or combine until two forms match. Or plug in a test number.",
    steps: ["(a + b)² = a² + 2ab + b², not a² + b².", "(x + p)(x + q) = x² + (p + q)x + pq.", "Shortcut: substitute a value like x = 2 into the original and each choice."],
    example: { problem: "(2x − 3)²", solution: "4x² − 12x + 9" },
    traps: ["Dropping the middle term", "Sign errors with negatives", "Choosing a test number like 0 or 1 that makes several choices match"],
  },
  {
    id: "nonlinear-equations", title: "Quadratics and nonlinear equations", minutes: 6,
    idea: "Set the equation to 0, then factor, use the quadratic formula, or graph it.",
    steps: ["Factor: find numbers that multiply to c and add to b.", "Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a.", "Discriminant b² − 4ac: > 0 two solutions, = 0 one, < 0 none.", "Sum of roots = −b/a, product = c/a.", "Radicals: square both sides, then check for extraneous answers."],
    example: { problem: "x² − 5x − 14 = 0", solution: "(x − 7)(x + 2) = 0 → x = 7 or −2" },
    traps: ["Roots have the opposite sign of the numbers in the factors", "Forgetting the ±", "Not checking radical equations"],
  },
  {
    id: "nonlinear-functions", title: "Quadratic and exponential functions", minutes: 6,
    idea: "Know what each part of a function's formula means on its graph and in context.",
    steps: ["Vertex form a(x − h)² + k: vertex (h, k); min/max value is k.", "Standard form: the vertex x-value is −b/(2a).", "Exponential a·b^t: a = start value; b > 1 grows by (b − 1)×100%, b < 1 decays.", "Same percent each period → exponential. Same amount → linear.", "f(g(x)): evaluate the inside first."],
    example: { problem: "f(t) = 300(1.05)^t", solution: "Starts at 300, grows 5% per period." },
    traps: ["Min VALUE (y) vs. WHERE (x)", "Reading 0.92 as a 92% decrease (it's 8%)"],
  },
  {
    id: "ratios-rates", title: "Ratios, rates, and unit conversion", minutes: 4,
    idea: "Keep units attached to every number and let them cancel.",
    steps: ["Set up proportions with matching units in matching positions.", "Convert by multiplying by fractions equal to 1 (e.g., 60 min / 1 h).", "Check that the answer has the right units and a sensible size."],
    example: { problem: "15 m/s to km/h", solution: "15 × 3600 / 1000 = 54 km/h" },
    traps: ["Flipped proportions", "Converting only one unit", "Adding instead of scaling"],
  },
  {
    id: "percentages", title: "Percentages", minutes: 5,
    idea: "Turn percent changes into multipliers: +p% → ×(1 + p/100), −p% → ×(1 − p/100).",
    steps: ["Percent of: part = percent × whole.", "Successive changes multiply. They never add.", "To find the original, divide by the multiplier.", "Plug in 100 as the starting value to make it easy."],
    example: { problem: "+20% then −20%", solution: "1.2 × 0.8 = 0.96 → 4% lower than the original" },
    traps: ["Adding percent changes", "Undoing a discount by adding the same percent back"],
  },
  {
    id: "one-var-data", title: "Mean, median, and spread", minutes: 5,
    idea: "Mean uses sums; median uses position in a sorted list.",
    steps: ["Sum = mean × count. Use totals for 'new value added' questions.", "Sort before finding the median. With an even count, average the middle two.", "Outliers move the mean far more than the median.", "Standard deviation measures spread. A more clustered set has a smaller SD."],
    example: { problem: "Mean of 4 tests = 80. Fifth test makes the mean 82.", solution: "5 × 82 − 4 × 80 = 90" },
    traps: ["Not sorting before the median", "Confusing mean and median when there are outliers"],
  },
  {
    id: "two-var-data", title: "Scatterplots and models", minutes: 4,
    idea: "A line of best fit gives predicted values. Slope = predicted change in y per 1 unit of x.",
    steps: ["Plug x into the model to predict y.", "Interpret slope with units: 'for each additional ___, ___ is predicted to change by ___'.", "Interpret the intercept as the predicted value at x = 0 (if that makes sense in context).", "Predictions are estimates, not exact values."],
    example: { problem: "y = 2.5x + 10, x = hours", solution: "Each extra hour → about 2.5 more units predicted." },
    traps: ["Treating predictions as exact", "Swapping slope and intercept meanings"],
  },
  {
    id: "probability", title: "Probability and two-way tables", minutes: 4,
    idea: "Probability = favorable ÷ total, where the 'total' is the group you're choosing from.",
    steps: ["Identify the group in the condition ('given', 'of those who…', 'who').", "Use that group's total as the denominator.", "Find the overlap count as the numerator."],
    example: { problem: "Of 40 juniors, 12 play chess. P(chess | junior)?", solution: "12/40 = 0.3" },
    traps: ["Dividing by the grand total", "Using the wrong row or column"],
  },
  {
    id: "inference-stats", title: "Sampling, margin of error, and study design", minutes: 5,
    idea: "Random sampling lets you generalize. Random assignment lets you claim cause and effect.",
    steps: ["Generalize only to the population that was randomly sampled.", "A causal claim needs random assignment to treatments.", "Margin of error: estimate ± MOE is a plausible range for the population value.", "Larger samples → smaller margin of error."],
    example: { problem: "52% ± 3%", solution: "Plausibly 49%–55% of the population." },
    traps: ["Volunteer or convenience samples", "Claiming causation from an observational study", "Applying the range to the sample instead of the population"],
  },
  {
    id: "area-volume", title: "Area and volume", minutes: 4,
    idea: "Use the reference sheet. Scale factors: length ×k → area ×k², volume ×k³.",
    steps: ["Identify the shape and the formula.", "Watch radius vs. diameter.", "For composite shapes, add or subtract simple pieces."],
    example: { problem: "Cylinder r = 3, h = 5", solution: "V = π · 9 · 5 = 45π" },
    traps: ["Using the diameter as the radius", "Forgetting to square or cube the scale factor"],
  },
  {
    id: "lines-angles-triangles", title: "Lines, angles, and triangles", minutes: 5,
    idea: "Angle facts plus similar triangles answer most of these questions.",
    steps: ["Straight line = 180°, triangle = 180°, around a point = 360°.", "Parallel lines: alternate interior and corresponding angles are equal.", "Exterior angle = sum of the two remote interior angles.", "Similar triangles: corresponding sides share one scale factor."],
    example: { problem: "Triangle angles 50° and 60°. Third angle?", solution: "70°" },
    traps: ["Treating equal angles as supplementary", "Scaling additively instead of multiplicatively"],
  },
  {
    id: "right-triangles-trig", title: "Right triangles and trigonometry", minutes: 6,
    idea: "Pythagorean theorem for sides, SOH-CAH-TOA for angles.",
    steps: ["a² + b² = c² (c = hypotenuse).", "Know the triples 3-4-5, 5-12-13, 8-15-17, 7-24-25 and their multiples.", "SOH-CAH-TOA, measured relative to the angle in the question.", "sin(x) = cos(90° − x).", "Special right triangles: 30-60-90 (1 : √3 : 2), 45-45-90 (1 : 1 : √2)."],
    example: { problem: "sin(A) = 3/5. cos(90° − A)?", solution: "3/5" },
    traps: ["Opposite/adjacent relative to the wrong angle", "Forgetting the square root"],
  },
  {
    id: "circles", title: "Circles", minutes: 6,
    idea: "Circle equation: (x − h)² + (y − k)² = r². Arcs and sectors are fractions of the whole circle.",
    steps: ["Complete the square on the x-terms and y-terms to find the center and radius.", "The right side equals r², not r.", "Arc length = (θ/360)·2πr. Sector area = (θ/360)·πr².", "Radians: arc = rθ."],
    example: { problem: "x² + y² − 6x + 4y = 12", solution: "(x − 3)² + (y + 2)² = 25 → r = 5" },
    traps: ["Reading r² as r", "Sign of the center coordinates"],
  },
];

export const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
