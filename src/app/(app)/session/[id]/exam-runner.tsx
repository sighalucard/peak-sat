"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionView } from "@/lib/session-view";
import { Choices, Passage } from "@/components/question-view";
import { Desmos } from "@/components/desmos";
import { Button, Card, cx } from "@/components/ui";
import { sectionName } from "@/content/taxonomy";

type A = { response: string; marked: boolean; guessed: boolean; eliminated: string[]; timeMs: number };

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function ExamRunner({ initial }: { initial: SessionView }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [cur, setCur] = useState(initial.current ?? 0);
  const [answers, setAnswers] = useState<Record<string, A>>(() => toAnswers(initial));
  const [remaining, setRemaining] = useState<number | null>(initial.remainingSec);
  const [breakLeft, setBreakLeft] = useState<number | null>(initial.breakRemainingSec);
  const [showNav, setShowNav] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [hideTimer, setHideTimer] = useState(false);
  const dirty = useRef<Set<string>>(new Set());
  const qStart = useRef(Date.now());
  const submitted = useRef(false);
  // Mirror of `answers` so saves always send the latest values, even right after a state update.
  const answersRef = useRef(answers);
  const setAll = (next: Record<string, A>) => { answersRef.current = next; setAnswers(next); };

  const qs = view.questions;
  const item = qs[cur];
  const q = item?.q;
  const isBreak = view.phase === "break";
  const timed = remaining != null;

  // Track time spent on the current question.
  const commitTime = useCallback(() => {
    if (!q || document.hidden) return;
    const now = Date.now();
    const add = now - qStart.current;
    qStart.current = now;
    const p = answersRef.current;
    setAll({ ...p, [q.id]: { ...(p[q.id] ?? blank()), timeMs: (p[q.id]?.timeMs ?? 0) + add } });
    dirty.current.add(q.id);
  }, [q]);

  const save = useCallback(async (extra: Partial<{ breakRemainingSec: number }> = {}) => {
    const ids = [...dirty.current];
    dirty.current.clear();
    const payload = { answers: Object.fromEntries(ids.map((id) => [id, answersRef.current[id]]).filter(([, a]) => a)), current: cur, remainingSec: remaining, ...extra };
    try {
      const r = await fetch(`/api/sessions/${view.id}/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true });
      setSaveError(!r.ok);
      if (!r.ok) ids.forEach((id) => dirty.current.add(id));
    } catch {
      setSaveError(true);
      ids.forEach((id) => dirty.current.add(id));
    }
  }, [cur, remaining, view.id]);

  const submit = useCallback(async (ranOutOfTime = false) => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    commitTime();
    await save();
    const r = await fetch(`/api/sessions/${view.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ranOutOfTime }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      submitted.current = false;
      setBusy(false);
      alert(d.error ?? "Couldn't submit. Your answers are saved. Please try again.");
      return;
    }
    if (d.done) {
      router.refresh();
      return;
    }
    // Next module (or break) in a full test.
    const v = (await (await fetch(`/api/sessions/${view.id}`)).json()) as SessionView;
    setView(v);
    setAll(toAnswers(v));
    setCur(0);
    setRemaining(v.remainingSec);
    setBreakLeft(v.breakRemainingSec);
    setConfirm(false);
    setShowCalc(false);
    submitted.current = false;
    setBusy(false);
    qStart.current = Date.now();
  }, [commitTime, save, view.id, router]);

  // Countdown. The timer pauses when the page is closed (unlike the real test).
  useEffect(() => {
    if (isBreak) {
      const t = setInterval(() => setBreakLeft((b) => (b == null ? b : Math.max(0, b - 1))), 1000);
      return () => clearInterval(t);
    }
    if (!timed) return;
    const t = setInterval(() => setRemaining((r) => (r == null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(t);
  }, [timed, isBreak]);

  useEffect(() => {
    if (timed && remaining === 0 && !isBreak) submit(true);
  }, [remaining, timed, isBreak, submit]);

  // Autosave every 10 seconds and when the tab is hidden.
  useEffect(() => {
    const t = setInterval(() => { commitTime(); save(isBreak && breakLeft != null ? { breakRemainingSec: breakLeft } : {}); }, 10000);
    const vis = () => { if (document.hidden) { commitTime(); save(); } else qStart.current = Date.now(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [commitTime, save, isBreak, breakLeft]);

  function go(i: number) {
    commitTime();
    setCur(Math.max(0, Math.min(qs.length - 1, i)));
    setShowNav(false);
  }
  function update(patch: Partial<A>) {
    if (!q) return;
    const p = answersRef.current;
    setAll({ ...p, [q.id]: { ...(p[q.id] ?? blank()), ...patch } });
    dirty.current.add(q.id);
  }

  async function endBreak() {
    setBusy(true);
    await fetch(`/api/sessions/${view.id}/break-end`, { method: "POST" });
    const v = (await (await fetch(`/api/sessions/${view.id}`)).json()) as SessionView;
    setView(v);
    setAll(toAnswers(v));
    setCur(0);
    setRemaining(v.remainingSec);
    setBusy(false);
    qStart.current = Date.now();
  }
  useEffect(() => { if (isBreak && breakLeft === 0) endBreak(); }, [isBreak, breakLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isBreak) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Break</p>
          <h1 className="mt-2 text-3xl font-bold">Reading and Writing complete</h1>
          <p className="mt-2 text-muted">On the real SAT you get a 10-minute break before Math. Stand up, stretch, drink some water.</p>
          <div className="my-6 text-5xl font-bold tabular-nums">{fmtClock(breakLeft ?? 0)}</div>
          <Button onClick={endBreak} disabled={busy}>Resume testing now</Button>
          <p className="mt-3 text-xs text-muted">Math starts automatically when the break ends.</p>
        </Card>
      </div>
    );
  }
  if (!q) return null;

  const a = answers[q.id] ?? blank();
  const unanswered = qs.filter((x) => !answers[x!.q.id]?.response).length;
  const markedCount = qs.filter((x) => answers[x!.q.id]?.marked).length;
  const header = view.module ? `${sectionName(view.module.section)}: Module ${view.module.index}` : view.title;

  return (
    <div className="-mx-4 -my-6 min-h-dvh bg-surface sm:-mx-6 lg:-mx-10 lg:-my-8">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{header}</div>
          {view.kind === "diagnostic" && <div className="text-xs text-muted">Untimed. Time per question is recorded.</div>}
        </div>
        {timed ? (
          <div className="flex items-center gap-2">
            {!hideTimer && <span className={cx("font-mono text-lg font-bold tabular-nums", remaining! <= 300 && "text-bad")} aria-live={remaining! <= 300 ? "polite" : "off"}>{fmtClock(remaining!)}</span>}
            <button onClick={() => setHideTimer(!hideTimer)} className="rounded-lg border border-line px-2 py-0.5 text-xs text-muted">{hideTimer ? "Show" : "Hide"}</button>
          </div>
        ) : <span className="text-sm text-muted">Untimed</span>}
        <div className="flex items-center gap-1">
          {q.section === "MATH" && <>
            <button onClick={() => setShowCalc(!showCalc)} className={cx("rounded-lg px-2.5 py-1.5 text-sm", showCalc ? "bg-brand-soft text-brand" : "hover:bg-slate-100")}>Calculator</button>
            <button onClick={() => setShowRef(true)} className="rounded-lg px-2.5 py-1.5 text-sm hover:bg-slate-100">Reference</button>
          </>}
        </div>
      </div>
      {saveError && <div className="bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">Having trouble saving. Your answers are kept on this page and we'll keep retrying.</div>}

      <div className={cx("grid min-h-[calc(100dvh-8rem)]", showCalc ? "lg:grid-cols-[minmax(0,26rem)_1fr]" : "")}>
        {showCalc && <div className="border-b border-line lg:border-b-0 lg:border-r"><Desmos className="h-[22rem] w-full lg:h-[calc(100dvh-8rem)]" /></div>}
        <div className={cx("mx-auto grid w-full max-w-6xl gap-6 px-4 py-6", (q.passage || q.table) && q.section === "RW" && !showCalc ? "lg:grid-cols-2" : "max-w-3xl")}>
          {(q.passage || q.table) && <div className={cx(q.section === "RW" && !showCalc && "lg:border-r lg:border-line lg:pr-6")}><Passage q={q} /></div>}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="grid h-8 w-8 place-items-center rounded bg-ink text-sm font-bold text-white">{cur + 1}</span>
              <button onClick={() => update({ marked: !a.marked })} aria-pressed={a.marked} className={cx("flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm", a.marked ? "text-bad" : "text-muted hover:text-ink")}>
                <span aria-hidden>{a.marked ? "⚑" : "⚐"}</span> Mark for review
              </button>
            </div>
            <p className="prose-line font-medium leading-relaxed">{q.stem}</p>
            <Choices q={q} value={a.response} onChange={(v) => update({ response: v })} eliminated={a.eliminated}
              onEliminate={(l) => update({ eliminated: a.eliminated.includes(l) ? a.eliminated.filter((x) => x !== l) : [...a.eliminated, l] })} />
            {view.kind === "diagnostic" && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={a.guessed} onChange={(e) => update({ guessed: e.target.checked })} className="h-4 w-4" />
                I guessed on this one
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t border-line bg-surface px-4 py-2.5">
        <button onClick={() => setShowNav(!showNav)} className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white">Question {cur + 1} of {qs.length} ▴</button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => go(cur - 1)} disabled={cur === 0}>Back</Button>
          {cur < qs.length - 1 ? <Button onClick={() => go(cur + 1)}>Next</Button> : <Button onClick={() => { commitTime(); setConfirm(true); }}>Review and submit</Button>}
        </div>
      </div>

      {(showNav || confirm) && (
        <div className="fixed inset-0 z-30 grid place-items-end bg-slate-900/30 sm:place-items-center" onClick={() => { setShowNav(false); setConfirm(false); }}>
          <div className="w-full max-w-xl rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl fade-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Question navigator">
            <h2 className="font-semibold">{confirm ? "Check your work" : header}</h2>
            <p className="mt-1 text-sm text-muted">{qs.length - unanswered} answered · {unanswered} unanswered · {markedCount} marked for review</p>
            <div className="mt-4 grid grid-cols-8 gap-2 sm:grid-cols-10">
              {qs.map((x, i) => {
                const ans = answers[x!.q.id];
                return (
                  <button key={x!.q.id} onClick={() => { go(i); setConfirm(false); }} aria-label={`Question ${i + 1}${ans?.response ? ", answered" : ", unanswered"}${ans?.marked ? ", marked" : ""}`}
                    className={cx("relative h-9 rounded-lg border text-sm font-semibold", i === cur && "ring-2 ring-brand", ans?.response ? "border-brand bg-brand text-white" : "border-dashed border-slate-400")}>
                    {i + 1}
                    {ans?.marked && <span className="absolute -right-1 -top-1 text-xs text-bad">⚑</span>}
                  </button>
                );
              })}
            </div>
            {confirm && (
              <div className="mt-5 border-t border-line pt-4">
                {unanswered > 0 && <p className="mb-3 text-sm text-warn">You have {unanswered} unanswered question{unanswered === 1 ? "" : "s"}. There's no penalty for guessing on the SAT.</p>}
                <p className="mb-3 text-sm text-muted">{view.kind === "fulltest" && view.module?.number !== 4 ? "After you submit, you can't return to this module." : "After you submit, you'll see your results and explanations."}</p>
                <div className="flex gap-2">
                  <Button onClick={() => submit(false)} disabled={busy}>{busy ? "Submitting…" : view.kind === "fulltest" && view.module?.number !== 4 ? "Submit module" : "Submit"}</Button>
                  <Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showRef && <ReferenceSheet onClose={() => setShowRef(false)} />}
    </div>
  );
}

function blank(): A {
  return { response: "", marked: false, guessed: false, eliminated: [], timeMs: 0 };
}

function toAnswers(v: SessionView) {
  const out: Record<string, A> = {};
  for (const x of v.questions) {
    if (!x) continue;
    out[x.q.id] = { response: x.answer?.response ?? "", marked: x.answer?.marked ?? false, guessed: x.answer?.guessed ?? false, eliminated: x.answer?.eliminated ?? [], timeMs: x.answer?.timeMs ?? 0 };
  }
  return out;
}

function ReferenceSheet({ onClose }: { onClose: () => void }) {
  const rows = [
    ["Circle", "A = πr², C = 2πr"], ["Rectangle", "A = ℓw"], ["Triangle", "A = ½bh"], ["Pythagorean theorem", "c² = a² + b²"],
    ["Special right triangles", "30-60-90: x, x√3, 2x · 45-45-90: s, s, s√2"], ["Rectangular prism", "V = ℓwh"], ["Cylinder", "V = πr²h"],
    ["Sphere", "V = (4/3)πr³"], ["Cone", "V = (1/3)πr²h"], ["Pyramid", "V = (1/3)ℓwh"],
    ["Facts", "A circle has 360° (2π radians). The angles of a triangle sum to 180°."],
  ];
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 p-4" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Reference sheet">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Reference</h2><button onClick={onClose} aria-label="Close">✕</button></div>
        <dl className="space-y-2 text-sm">{rows.map(([k, v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd className="text-muted">{v}</dd></div>)}</dl>
      </div>
    </div>
  );
}
