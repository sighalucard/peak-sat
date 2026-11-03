"use client";
import { useState } from "react";
import { Desmos } from "@/components/desmos";
import { Badge, Button, Card, cx } from "@/components/ui";
import { gradeSPR } from "@/content/math-util";

interface Exercise {
  id: string; skill: string; title: string; task: string; how: string[]; answer: number[]; answerText: string; byHand: string;
}

// Each answer below is checked by the same grader the question bank uses.
const EXERCISES: Exercise[] = [
  { id: "intersect", skill: "Solving systems", title: "Find an intersection", task: "Solve the system y = 2x + 3 and y = −x + 9. What is the x-coordinate of the solution?", how: ["Type y=2x+3 on line 1 and y=-x+9 on line 2.", "Click the point where the lines cross. Desmos shows its coordinates (2, 7)."], answer: [2], answerText: "2", byHand: "By hand: 2x + 3 = −x + 9 → 3x = 6 → x = 2. Both take about 20 seconds here, so use whichever you trust more." },
  { id: "roots", skill: "Identifying roots", title: "Find the zeros of a quadratic", task: "What is the positive solution of 3x² − 5x − 12 = 0? (Enter the exact value.)", how: ["Type y=3x^2-5x-12.", "Click the gray points where the curve crosses the x-axis: (−1.333, 0) and (3, 0)."], answer: [3], answerText: "3", byHand: "Factoring (3x + 4)(x − 3) takes trial and error; Desmos is faster when the factors aren't obvious." },
  { id: "vertex", skill: "Analyzing functions", title: "Find a minimum value", task: "What is the minimum value of f(x) = x² − 10x + 31?", how: ["Type f(x)=x^2-10x+31.", "Click the vertex (the lowest point). Desmos shows (5, 6). The minimum VALUE is the y-coordinate."], answer: [6], answerText: "6", byHand: "By hand: x = −b/(2a) = 5, f(5) = 25 − 50 + 31 = 6. Fast either way, but Desmos avoids sign slips." },
  { id: "system-nonlinear", skill: "Solving systems", title: "A line and a parabola", task: "The graphs of y = x² − 4 and y = 2x − 1 intersect at two points. What is the sum of their x-coordinates?", how: ["Graph both equations.", "Click both intersection points: (−1, −3) and (3, 5).", "Add the x-coordinates: −1 + 3."], answer: [2], answerText: "2", byHand: "By hand: x² − 4 = 2x − 1 → x² − 2x − 3 = 0, and the sum of roots is −b/a = 2. Knowing that shortcut is faster than graphing." },
  { id: "regression", skill: "Checking answers / data", title: "Use a table and regression", task: "Find the slope of the line through (1, 4), (3, 10), and (6, 19). Enter it as a number.", how: ["Click + and add a table. Enter x₁: 1, 3, 6 and y₁: 4, 10, 19.", "On a new line type y_1 ~ mx_1 + b. Desmos reports m = 3 and b = 1."], answer: [3], answerText: "3", byHand: "By hand: (10 − 4)/(3 − 1) = 3. For two points, by hand is faster. Regression shines with messy tables." },
  { id: "inequality", skill: "Exploring relationships", title: "Check a point against an inequality", task: "Which value of k makes the point (2, k) lie on the boundary line of y > 3x − 4? Enter k.", how: ["Type y>3x-4 to see the shaded region and the dashed boundary.", "Type x=2 and click where it meets the boundary: (2, 2)."], answer: [2], answerText: "2", byHand: "By hand: k = 3(2) − 4 = 2. Plugging in is faster, but graphing helps when the question asks which region a point is in." },
];

const WHEN = [
  { q: "Solve 4x + 7 = 31.", best: "hand", why: "Two quick steps by hand (x = 6). Typing it into Desmos is slower." },
  { q: "How many solutions does x³ − 4x + 1 = 0 have?", best: "desmos", why: "Graph it and count the x-intercepts (3). There's no quick algebraic method." },
  { q: "What is 15% of 80?", best: "hand", why: "Mental math: 10% is 8, 5% is 4, total 12." },
  { q: "For what x do 2^x and x + 3 intersect when x > 0?", best: "desmos", why: "Exponential and linear together usually can't be solved with SAT algebra. Graph and click the intersection." },
  { q: "Expand (x + 3)(x − 5).", best: "hand", why: "FOIL takes seconds. Desmos can't show you the expanded form directly." },
  { q: "Find the radius of x² + y² − 6x + 8y = 0.", best: "either", why: "Completing the square works (r = 5), and so does graphing and reading the circle. Use the one you're faster and more accurate with." },
];

export function DesmosTraining() {
  const [active, setActive] = useState(0);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [picks, setPicks] = useState<Record<number, string>>({});
  const ex = EXERCISES[active];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr] [&>*]:min-w-0">
        <Card className="h-fit break-words">
          <div className="mb-3 flex flex-wrap gap-1">
            {EXERCISES.map((e, i) => (
              <button key={e.id} onClick={() => setActive(i)} className={cx("h-8 w-8 rounded-lg text-sm font-semibold", i === active ? "bg-brand text-white" : results[e.id] ? "bg-good-soft text-good" : "bg-slate-100")}>{i + 1}</button>
            ))}
          </div>
          <Badge tone="brand">{ex.skill}</Badge>
          <h2 className="mt-2 font-semibold">{ex.title}</h2>
          <p className="mt-2">{ex.task}</p>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setResults((r) => ({ ...r, [ex.id]: gradeSPR(inputs[ex.id] ?? "", ex.answer) })); }}>
            <input value={inputs[ex.id] ?? ""} onChange={(e) => setInputs((p) => ({ ...p, [ex.id]: e.target.value }))} placeholder="Your answer" aria-label="Your answer" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 font-mono" />
            <Button type="submit">Check</Button>
          </form>
          {ex.id in results && <p className={cx("mt-2 rounded-xl px-3 py-2 text-sm", results[ex.id] ? "bg-good-soft text-good" : "bg-bad-soft text-bad")}>{results[ex.id] ? "Correct!" : "Not quite. Try again or show the steps."}</p>}
          <button onClick={() => setShown((p) => ({ ...p, [ex.id]: !p[ex.id] }))} className="mt-3 text-sm font-semibold text-brand">{shown[ex.id] ? "Hide steps" : "Show Desmos steps"}</button>
          {shown[ex.id] && (
            <div className="mt-2 space-y-2 text-sm">
              <ol className="list-decimal space-y-1 pl-5">{ex.how.map((h) => <li key={h}>{h}</li>)}</ol>
              <p className="rounded-xl bg-slate-50 px-3 py-2"><b>Answer: {ex.answerText}.</b> {ex.byHand}</p>
            </div>
          )}
        </Card>
        <Card className="p-0 overflow-hidden"><Desmos key={ex.id} className="h-[32rem] w-full" /></Card>
      </div>

      <Card>
        <h2 className="font-semibold">Desmos or by hand?</h2>
        <p className="mb-4 text-sm text-muted">The calculator is a tool, not a default. Decide which is faster for each problem.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {WHEN.map((w, i) => (
            <div key={i} className="rounded-xl border border-line p-4">
              <p className="font-medium">{w.q}</p>
              <div className="mt-2 flex gap-2">
                {["desmos", "hand"].map((c) => (
                  <button key={c} onClick={() => setPicks((p) => ({ ...p, [i]: c }))} className={cx("rounded-lg border px-3 py-1 text-sm", picks[i] === c ? "border-brand bg-brand-soft text-brand" : "border-line")}>{c === "desmos" ? "Desmos" : "By hand"}</button>
                ))}
              </div>
              {picks[i] && <p className={cx("mt-2 text-sm", w.best === "either" || picks[i] === w.best ? "text-good" : "text-warn")}>{w.best === "either" ? "Either works: " : picks[i] === w.best ? "Good call: " : "Usually not the fastest: "}{w.why}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
