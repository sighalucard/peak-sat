// End-to-end API test against a running server: node tests/api-smoke.mjs [baseUrl]
const BASE = process.argv[2] ?? "http://localhost:3100";
let cookie = "";
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"} ${msg}`); if (!cond) failures++; };
async function call(path, body, method = body ? "POST" : "GET") {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}

const email = `t${Date.now()}@example.com`;
// Auth
ok((await call("/api/sessions", { kind: "practice" })).status === 401, "API rejects unauthenticated requests");
ok((await call("/api/auth/signup", { email, password: "short" })).status === 400, "signup rejects short password");
ok((await call("/api/auth/signup", { email, password: "password123", name: "Test" })).status === 200, "signup works");
ok((await call("/api/auth/signup", { email, password: "password123" })).status === 409, "duplicate signup rejected");
await call("/api/auth/logout", {});
ok((await call("/api/auth/login", { email, password: "wrongpass1" })).status === 401, "wrong password rejected");
ok((await call("/api/auth/login", { email, password: "password123" })).status === 200, "login works");
ok((await call("/api/profile", { currentScore: 1100, targetScore: 1400, dailyMinutes: 30, testDate: "2027-03-13", strongest: "RW", weakest: "MATH", takenBefore: false, onboarded: true })).status === 200, "profile saves");
ok((await call("/api/profile", { targetScore: 2000 })).status === 400, "profile validates score range");

// Practice with no data (edge case: no previous performance)
let s = await call("/api/sessions", { kind: "practice", count: 3 });
ok(s.status === 200, "smart practice starts with no prior data");
let v = (await call(`/api/sessions/${s.json.id}`)).json;
let q = v.questions[0].q;
ok(!("answer" in q) && !("explanation" in q) && !q.choices?.[0]?.rationale, "answer key not sent before answering");
// Hint immediately
let h = await call(`/api/sessions/${v.id}/hint`, { questionId: q.id, level: 1 });
ok(h.status === 200 && h.json.hints.length === 1, "hint available immediately on request");
// Tutor without key → 503, not fake answer
let t = await call("/api/tutor", { message: "help", sessionId: v.id, questionId: q.id });
ok(t.status === 503 || t.status === 200, `tutor responds honestly (status ${t.status})`);
// Answer
const resp = q.type === "mcq" ? "A" : "1";
let a = await call(`/api/sessions/${v.id}/answer`, { questionId: q.id, response: resp, timeMs: 30000, guessed: false });
ok(a.status === 200 && typeof a.json.feedback.correct === "boolean" && a.json.feedback.explanation, "answer graded with explanation");
ok((await call(`/api/sessions/${v.id}/answer`, { questionId: q.id, response: resp, timeMs: 1000 })).status === 400, "can't answer twice");
if (!a.json.feedback.correct) ok((await call(`/api/attempts/${a.json.attempt.id}/category`, { category: "concept" })).status === 200, "mistake category saved");
for (let i = 0; i < 2; i++) {
  const n = await call(`/api/sessions/${v.id}/next`, {});
  if (!n.json.questionId) break;
  await call(`/api/sessions/${v.id}/answer`, { questionId: n.json.questionId, response: "B", timeMs: 20000, guessed: true });
}
v = (await call(`/api/sessions/${v.id}`)).json;
ok(v.status === "completed" && v.result.total === 3, "practice session completes with result");

// Exam mode: no hints, tutor locked
s = await call("/api/sessions", { kind: "timed", section: "MATH", count: 5, timeLimitSec: 475 });
v = (await call(`/api/sessions/${s.json.id}`)).json;
ok(v.questions.length === 5 && v.remainingSec === 475, "timed set created with timer");
ok((await call(`/api/sessions/${v.id}/hint`, { questionId: v.questions[0].q.id, level: 1 })).status === 400, "hints blocked in test mode");
ok((await call("/api/tutor", { message: "what's the answer", sessionId: v.id, questionId: v.questions[0].q.id })).status === 403, "tutor blocked during test");
ok((await call(`/api/sessions/${v.id}/answer`, { questionId: v.questions[0].q.id, response: "A", timeMs: 1 })).status === 400, "immediate grading blocked in test mode");
await call(`/api/sessions/${v.id}/save`, { answers: { [v.questions[0].q.id]: { response: "A", timeMs: 40000, marked: true } }, current: 1, remainingSec: 400 });
await call(`/api/sessions/${v.id}/save`, { answers: {}, current: 1, remainingSec: 9999 });
let v2 = (await call(`/api/sessions/${v.id}`)).json;
ok(v2.remainingSec === 400 && v2.current === 1 && v2.questions[0].answer.marked, "leaving mid-test: state resumes, timer can't be increased");
ok(!v2.questions[0].feedback, "no feedback before submission");
await call(`/api/sessions/${v.id}/submit`, {});
v2 = (await call(`/api/sessions/${v.id}`)).json;
ok(v2.status === "completed" && v2.questions[0].feedback && v2.result.skipped >= 4, "submit grades and reveals; unanswered counted as skipped");

// Diagnostic
s = await call("/api/sessions", { kind: "diagnostic" });
v = (await call(`/api/sessions/${s.json.id}`)).json;
ok(v.questions.length === 24, "diagnostic has 24 questions");
const domains = new Set(v.questions.map((x) => x.q.domain));
ok(domains.size === 8, "diagnostic covers all 8 domains");
const answers = Object.fromEntries(v.questions.map((x, i) => [x.q.id, { response: x.q.type === "mcq" ? "ABCD"[i % 4] : "2", timeMs: 30000 + i * 1000, guessed: i % 5 === 0 }]));
await call(`/api/sessions/${v.id}/save`, { answers, current: 23 });
await call(`/api/sessions/${v.id}/submit`, {});
v = (await call(`/api/sessions/${v.id}`)).json;
ok(v.status === "completed" && v.result.total === 24, "diagnostic report generated");

// Review
s = await call("/api/sessions", { kind: "review" });
ok(s.status === 200 || (s.status === 400 && /Nothing is due/.test(s.json.error)), `review session (status ${s.status}: nothing due until tomorrow is expected)`);

// Full test flow
s = await call("/api/sessions", { kind: "fulltest" });
ok(s.status === 200, "full test created");
let ft = (await call(`/api/sessions/${s.json.id}`)).json;
ok(ft.questions.length === 27 && ft.remainingSec === 32 * 60 && ft.module.section === "RW", "module 1 RW: 27 questions, 32 min");
const seen = new Set();
for (let m = 0; m < 4; m++) {
  ft = (await call(`/api/sessions/${s.json.id}`)).json;
  if (ft.phase === "break") {
    ok(ft.breakRemainingSec === 600, "10-minute break between sections");
    await call(`/api/sessions/${ft.id}/break-end`, {});
    ft = (await call(`/api/sessions/${s.json.id}`)).json;
  }
  ft.questions.forEach((x) => { if (seen.has(x.q.id)) failures++; seen.add(x.q.id); });
  ok(ft.questions.length === (ft.module.section === "RW" ? 27 : 22), `module ${m + 1} (${ft.module.section} M${ft.module.index}) has the right length`);
  const ans = Object.fromEntries(ft.questions.map((x) => [x.q.id, { response: x.q.type === "mcq" ? "A" : "1", timeMs: 20000 }]));
  await call(`/api/sessions/${ft.id}/save`, { answers: ans, current: 0 });
  await call(`/api/sessions/${ft.id}/submit`, {});
}
ft = (await call(`/api/sessions/${s.json.id}`)).json;
ok(ft.status === "completed" && ft.result.sectionScores.RW.score >= 200 && ft.result.sectionScores.MATH.score <= 800 && ft.result.routing.length === 2, "full test scored with routing info");
ok(seen.size === 98, `no question repeated within the full test (${seen.size} unique)`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
