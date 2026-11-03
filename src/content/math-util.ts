// Small numeric helpers shared by math templates and the answer grader.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randInt(r: Rng, lo: number, hi: number) {
  return lo + Math.floor(r() * (hi - lo + 1));
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

export function shuffle<T>(r: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));

/** Format a number as an integer, a simple fraction, or a short decimal. */
export function fmt(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) n = Math.round(n);
  if (Number.isInteger(n)) return n < 0 ? `−${-n}` : String(n);
  // Short terminating decimals read naturally (0.28, 1.5); otherwise use a fraction.
  const r3 = Math.round(n * 1000) / 1000;
  if (Math.abs(r3 - n) < 1e-9) return String(r3).replace("-", "−");
  for (let d = 2; d <= 30; d++) {
    const num = n * d;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const k = Math.round(num);
      const g = gcd(k, d);
      const s = `${Math.abs(k) / g}/${d / g}`;
      return k < 0 ? `−${s}` : s;
    }
  }
  const s = String(Math.round(n * 1000) / 1000);
  return s.replace("-", "−");
}

/** Format a signed term like "+ 5" / "− 5" for building expressions. */
export function sgn(n: number) {
  return n < 0 ? `− ${-n}` : `+ ${n}`;
}

/** "3x", "x", "−x", "−3x" */
export function coef(n: number, v = "x") {
  if (n === 1) return v;
  if (n === -1) return `−${v}`;
  return `${fmt(n)}${v}`;
}

/** Signed coefficient term for the middle of an expression: " + 3x", " − x". */
export function term(n: number, v = "x") {
  if (n === 0) return "";
  const a = Math.abs(n);
  return `${n < 0 ? " − " : " + "}${a === 1 ? v : `${a}${v}`}`;
}

/** Signed constant: " + 5", " − 5", "" for zero. */
export function cterm(n: number) {
  if (n === 0) return "";
  return n < 0 ? ` − ${-n}` : ` + ${n}`;
}

/**
 * Parse a student-produced response. Accepts integers, decimals, negatives,
 * and fractions like "7/2" or "-7/2". Returns null when not a number.
 */
export function parseSPR(input: string): number | null {
  const s = input.trim().replace(/−/g, "-").replace(/\s+/g, "");
  if (!s) return null;
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return null;
    return Number(frac[1]) / d;
  }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  return null;
}

/**
 * SAT-style SPR grading: exact values match; a decimal entry of a non-terminating
 * answer is accepted when it is the answer rounded or truncated to the digits entered
 * (at least 3 decimal places, or the full 5-character entry for positives).
 */
export function gradeSPR(input: string, accepted: number[]): boolean {
  const v = parseSPR(input);
  if (v === null) return false;
  const s = input.trim().replace(/−/g, "-");
  const decimals = s.includes(".") && !s.includes("/") ? s.split(".")[1].length : 0;
  return accepted.some((a) => {
    if (approx(v, a)) return true;
    if (decimals >= 3 || (decimals >= 2 && s.length >= 5)) {
      const f = 10 ** decimals;
      return Math.abs(v - Math.round(a * f) / f) < 1e-9 || Math.abs(v - Math.trunc(a * f) / f) < 1e-9;
    }
    return false;
  });
}
