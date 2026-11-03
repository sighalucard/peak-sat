// Digital SAT content taxonomy, from the College Board "Assessment Framework for the
// Digital SAT Suite" (domains, skills, and approximate share of operational questions).

export type Section = "RW" | "MATH";

export type DomainId = "II" | "CS" | "EOI" | "SEC" | "ALG" | "ADV" | "PSDA" | "GEO";

export interface Domain {
  id: DomainId;
  section: Section;
  name: string;
  /** Approximate share of the section's operational questions (College Board framework). */
  weight: number;
}

export const DOMAINS: Domain[] = [
  { id: "II", section: "RW", name: "Information and Ideas", weight: 0.26 },
  { id: "CS", section: "RW", name: "Craft and Structure", weight: 0.28 },
  { id: "EOI", section: "RW", name: "Expression of Ideas", weight: 0.2 },
  { id: "SEC", section: "RW", name: "Standard English Conventions", weight: 0.26 },
  { id: "ALG", section: "MATH", name: "Algebra", weight: 0.35 },
  { id: "ADV", section: "MATH", name: "Advanced Math", weight: 0.35 },
  { id: "PSDA", section: "MATH", name: "Problem-Solving and Data Analysis", weight: 0.15 },
  { id: "GEO", section: "MATH", name: "Geometry and Trigonometry", weight: 0.15 },
];

export interface Skill {
  id: string;
  domain: DomainId;
  name: string;
  /** Relative frequency of this skill inside its domain (sums to ~1 per domain). */
  share: number;
}

export const SKILLS: Skill[] = [
  // Information and Ideas
  { id: "central-ideas", domain: "II", name: "Central Ideas and Details", share: 0.35 },
  { id: "evidence-textual", domain: "II", name: "Command of Evidence: Textual", share: 0.2 },
  { id: "evidence-quantitative", domain: "II", name: "Command of Evidence: Quantitative", share: 0.2 },
  { id: "inferences", domain: "II", name: "Inferences", share: 0.25 },
  // Craft and Structure
  { id: "words-in-context", domain: "CS", name: "Words in Context", share: 0.5 },
  { id: "text-structure", domain: "CS", name: "Text Structure and Purpose", share: 0.3 },
  { id: "cross-text", domain: "CS", name: "Cross-Text Connections", share: 0.2 },
  // Expression of Ideas
  { id: "rhetorical-synthesis", domain: "EOI", name: "Rhetorical Synthesis", share: 0.55 },
  { id: "transitions", domain: "EOI", name: "Transitions", share: 0.45 },
  // Standard English Conventions
  { id: "boundaries", domain: "SEC", name: "Boundaries", share: 0.55 },
  { id: "form-structure-sense", domain: "SEC", name: "Form, Structure, and Sense", share: 0.45 },
  // Algebra
  { id: "linear-one-var", domain: "ALG", name: "Linear equations in one variable", share: 0.2 },
  { id: "linear-functions", domain: "ALG", name: "Linear functions", share: 0.25 },
  { id: "linear-two-var", domain: "ALG", name: "Linear equations in two variables", share: 0.2 },
  { id: "systems", domain: "ALG", name: "Systems of two linear equations", share: 0.2 },
  { id: "linear-inequalities", domain: "ALG", name: "Linear inequalities", share: 0.15 },
  // Advanced Math
  { id: "equivalent-expressions", domain: "ADV", name: "Equivalent expressions", share: 0.3 },
  { id: "nonlinear-equations", domain: "ADV", name: "Nonlinear equations and systems", share: 0.35 },
  { id: "nonlinear-functions", domain: "ADV", name: "Nonlinear functions", share: 0.35 },
  // Problem-Solving and Data Analysis
  { id: "ratios-rates", domain: "PSDA", name: "Ratios, rates, proportions, and units", share: 0.25 },
  { id: "percentages", domain: "PSDA", name: "Percentages", share: 0.2 },
  { id: "one-var-data", domain: "PSDA", name: "One-variable data", share: 0.2 },
  { id: "two-var-data", domain: "PSDA", name: "Two-variable data and models", share: 0.15 },
  { id: "probability", domain: "PSDA", name: "Probability and conditional probability", share: 0.1 },
  { id: "inference-stats", domain: "PSDA", name: "Sample statistics and study design", share: 0.1 },
  // Geometry and Trigonometry
  { id: "area-volume", domain: "GEO", name: "Area and volume", share: 0.3 },
  { id: "lines-angles-triangles", domain: "GEO", name: "Lines, angles, and triangles", share: 0.25 },
  { id: "right-triangles-trig", domain: "GEO", name: "Right triangles and trigonometry", share: 0.25 },
  { id: "circles", domain: "GEO", name: "Circles", share: 0.2 },
];

export const skillById = new Map(SKILLS.map((s) => [s.id, s]));
export const domainById = new Map(DOMAINS.map((d) => [d.id, d]));

export function skillName(id: string) {
  return skillById.get(id)?.name ?? id;
}
export function domainName(id: string) {
  return domainById.get(id as DomainId)?.name ?? id;
}
export function sectionName(s: string) {
  return s === "RW" ? "Reading and Writing" : "Math";
}

/** Share of the whole section that a skill represents (domain weight × skill share). */
export function skillTestWeight(skillId: string) {
  const s = skillById.get(skillId);
  if (!s) return 0;
  return (domainById.get(s.domain)?.weight ?? 0) * s.share;
}

/** Official digital SAT structure (College Board). */
export const SAT_FORMAT = {
  RW: { modules: 2, questionsPerModule: 27, minutesPerModule: 32 },
  MATH: { modules: 2, questionsPerModule: 22, minutesPerModule: 35 },
  breakMinutes: 10,
} as const;

export const MISTAKE_CATEGORIES = [
  { id: "concept", label: "Conceptual misunderstanding" },
  { id: "misread", label: "Misread the question" },
  { id: "calculation", label: "Careless calculation" },
  { id: "algebra", label: "Algebra mistake" },
  { id: "formula", label: "Incorrect formula" },
  { id: "vocabulary", label: "Vocabulary misunderstanding" },
  { id: "grammar", label: "Grammar misunderstanding" },
  { id: "evidence", label: "Weak passage evidence" },
  { id: "time", label: "Time pressure" },
  { id: "elimination", label: "Poor answer elimination" },
  { id: "guess", label: "Guessing" },
] as const;

export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number]["id"];

export function mistakeLabel(id: string | null | undefined) {
  return MISTAKE_CATEGORIES.find((m) => m.id === id)?.label ?? "Uncategorized";
}
