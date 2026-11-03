// Small in-memory limiter for auth endpoints. Per-instance only; use a shared store
// (e.g. Redis) if the app runs on several servers.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
