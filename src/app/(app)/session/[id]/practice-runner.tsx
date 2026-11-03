"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionView } from "@/lib/session-view";
import { Choices, FeedbackPanel, Passage } from "@/components/question-view";
import { TutorChat } from "@/components/tutor-chat";
import { MistakePicker } from "@/components/mistake-picker";
import { Desmos } from "@/components/desmos";
import { Badge, Button, Card, cx, Progress } from "@/components/ui";
import { useActiveTimer } from "@/components/use-active-timer";
import { DIFFICULTY_LABEL } from "@/content/types";
import { skillName } from "@/content/taxonomy";
import { lessonById } from "@/content/lessons";

type QV = SessionView["questions"][number] & {};

// Hint nudges appear after this multiple of the question's expected time, per level,
// scaled by the student's own setting. They only appear while the student is idle.
const NUDGE_AT = [1.0, 1.6, 2.3];
const IDLE_MS = 15000;

export function PracticeRunner({ initial, hintFactor, autoNudges, tutorAvailable }: { initial: SessionView; hintFactor: number; autoNudges: boolean; tutorAvailable: boolean }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [idx, setIdx] = useState(Math.max(0, initial.questions.length - 1));
  const item = view.questions[idx] as QV | undefined;
  const q = item?.q;
  const answered = !!item?.feedback;

  const [value, setValue] = useState("");
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [guessed, setGuessed] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [nudge, setNudge] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState(0);
  const [panel, setPanel] = useState<"none" | "tutor" | "calc">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestLesson, setSuggestLesson] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const lastActivity = useRef(Date.now());
  const timer = useActiveTimer(q?.id ?? "none", item?.answer?.timeMs ?? 0, !!q && !answered);

  useEffect(() => {
    setValue(item?.answer?.response ?? "");
    setEliminated(item?.answer?.eliminated ?? []);
    setGuessed(item?.answer?.guessed ?? false);
    setHints(item?.revealedHints ?? []);
    setNudge(false);
    setDismissedUntil(0);
    setError(null);
    setSaved(item?.saved ?? false);
    lastActivity.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  const touch = useCallback(() => { lastActivity.current = Date.now(); setNudge(false); }, []);

  // Progressive hint nudges: based on expected solving time, never while the student is active.
  useEffect(() => {
    if (!q || answered || !autoNudges || hints.length >= 3) return;
    const threshold = q.expectedSec * 1000 * hintFactor * NUDGE_AT[hints.length];
    const idle = Date.now() - lastActivity.current;
    if (timer.ms >= Math.max(threshold, dismissedUntil) && idle >= IDLE_MS) setNudge(true);
  }, [timer.ms, q, answered, autoNudges, hints.length, hintFactor, dismissedUntil]);

  async function refresh() {
    const r = await fetch(`/api/sessions/${view.id}`);
    if (r.ok) {
      const v = (await r.json()) as SessionView;
      setView(v);
      return v;
    }
    return null;
  }

  async function getHint() {
    if (!q) return;
    setNudge(false);
    const level = Math.min(3, hints.length + 1);
    const r = await fetch(`/api/sessions/${view.id}/hint`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, level }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setHints(d.hints);
    else setError(d.error ?? "Couldn't load a hint.");
  }

  async function submit() {
    if (!q || !value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/sessions/${view.id}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, response: value, timeMs: timer.read(), guessed }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSuggestLesson(d.suggestLesson);
      await refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't submit. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    setBusy(true);
    setError(null);
    if (idx < view.questions.length - 1) {
      setIdx(idx + 1);
      setBusy(false);
      return;
    }
    if (view.kind === "practice") {
      const r = await fetch(`/api/sessions/${view.id}/next`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "Couldn't load the next question."); setBusy(false); return; }
      if (!d.questionId) return finish();
      const v = await refresh();
      if (v) setIdx(v.questions.length - 1);
    } else {
      return finish();
    }
    setBusy(false);
  }

  async function finish() {
    setBusy(true);
    await fetch(`/api/sessions/${view.id}/finish`, { method: "POST" });
    router.refresh();
  }

  async function toggleSave() {
    if (!q) return;
    const r = await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, saved: !saved }) });
    if (r.ok) setSaved(!saved);
  }

  if (!q || !item) {
    return (
      <Card className="text-center">
        <p className="font-semibold">No questions left in this session.</p>
        <Button className="mt-4" onClick={finish}>See results</Button>
      </Card>
    );
  }

  const total = view.count;
  const doneCount = view.questions.filter((x) => x?.feedback).length;
  const isLast = view.kind === "review" ? idx === view.questions.length - 1 : doneCount >= total;
  const lesson = suggestLesson ? lessonById.get(suggestLesson) : null;

  return (
    <div onKeyDown={touch} onClick={touch} onScroll={touch}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/practice" className="text-sm text-muted hover:text-ink">← Practice</Link>
          <h1 className="text-xl font-bold">{view.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums text-muted" title="Time on this question (not a countdown)">⏱ {Math.floor(timer.ms / 60000)}:{String(Math.floor(timer.ms / 1000) % 60).padStart(2, "0")}</span>
          <span className="text-sm font-medium">{Math.min(idx + 1, total)} / {total}</span>
          <Button variant="secondary" onClick={finish} disabled={busy}>End session</Button>
        </div>
      </div>
      <Progress value={(doneCount / total) * 100} className="mb-5" label="Session progress" />

      <div className={cx("grid gap-5", panel !== "none" ? "xl:grid-cols-[1fr_24rem]" : "")}>
        <Card className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{skillName(q.skill)}</Badge>
            <Badge>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
            <div className="ml-auto flex gap-1">
              <button onClick={toggleSave} className={cx("rounded-lg px-2.5 py-1.5 text-sm", saved ? "text-brand" : "text-muted hover:bg-slate-100")} aria-pressed={saved}>{saved ? "★ Saved" : "☆ Save"}</button>
              {q.section === "MATH" && <button onClick={() => setPanel(panel === "calc" ? "none" : "calc")} className={cx("rounded-lg px-2.5 py-1.5 text-sm", panel === "calc" ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-100")}>Calculator</button>}
              <button onClick={() => setPanel(panel === "tutor" ? "none" : "tutor")} className={cx("rounded-lg px-2.5 py-1.5 text-sm", panel === "tutor" ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-100")}>AI Tutor</button>
            </div>
          </div>

          <div className={cx("grid gap-6", (q.passage || q.table) && q.section === "RW" ? "lg:grid-cols-2" : "")}>
            {(q.passage || q.table) && <div className={q.section === "RW" ? "lg:border-r lg:border-line lg:pr-6" : ""}><Passage q={q} /></div>}
            <div className="space-y-4">
              <p className="prose-line font-medium leading-relaxed">{q.stem}</p>
              <Choices q={q} value={value} onChange={(v) => { touch(); setValue(v); }} eliminated={eliminated}
                onEliminate={(l) => { touch(); setEliminated((e) => (e.includes(l) ? e.filter((x) => x !== l) : [...e, l])); }}
                feedback={item.feedback} disabled={answered} />

              {!answered && (
                <>
                  {hints.length > 0 && (
                    <div className="space-y-2">
                      {hints.map((h, i) => (
                        <div key={i} className="rounded-xl border border-amber-200 bg-warn-soft px-4 py-2.5 text-sm fade-in">
                          <span className="font-semibold text-warn">{["Hint", "Strategy", "Next step"][i]}: </span>{h}
                        </div>
                      ))}
                    </div>
                  )}
                  {nudge && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-warn-soft/60 px-4 py-2.5 text-sm fade-in" role="status">
                      <span>Taking a while? That's okay. A {hints.length === 0 ? "small hint" : "next hint"} is available if you want it.</span>
                      <Button variant="secondary" className="px-3 py-1" onClick={getHint}>Show hint</Button>
                      <button className="text-muted hover:text-ink" onClick={() => { setNudge(false); setDismissedUntil(timer.ms + 60000); }}>Dismiss</button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <Button onClick={submit} disabled={!value || busy}>{busy ? "Checking…" : "Submit answer"}</Button>
                    {hints.length < 3 && <Button variant="secondary" onClick={getHint}>{hints.length === 0 ? "Get a hint" : "Next hint"}</Button>}
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input type="checkbox" checked={guessed} onChange={(e) => setGuessed(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
                      I'm guessing
                    </label>
                  </div>
                  <p className="text-xs text-muted">Hints don't lower your score. We track them so your review schedule knows which questions to bring back.</p>
                </>
              )}
              {error && <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
            </div>
          </div>

          {item.feedback && (
            <div className="mt-6 border-t border-line pt-6">
              <FeedbackPanel fb={item.feedback}>
                {!item.feedback.correct && item.attempt && <MistakePicker attemptId={item.attempt.id} suggested={item.attempt.mistakeCategory} confirmed={item.attempt.mistakeConfirmed} />}
                {lesson && (
                  <div className="rounded-xl border border-line px-4 py-3 text-sm">
                    <p className="font-semibold">You've missed a couple of these in a row. That's normal while learning.</p>
                    <p className="mt-1 text-muted">The next one will be a bit easier. A {lesson.minutes}-minute lesson on <b>{lesson.title}</b> may help first.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link href={`/lessons/${lesson.id}`} target="_blank" className="font-semibold text-brand">Open the lesson ↗</Link>
                      {tutorAvailable && <button className="font-semibold text-brand" onClick={() => setPanel("tutor")}>Ask the tutor to teach it</button>}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={isLast ? finish : next} disabled={busy}>{isLast ? "Finish and see results" : "Next question →"}</Button>
                  {idx > 0 && <Button variant="ghost" onClick={() => setIdx(idx - 1)}>← Previous</Button>}
                </div>
              </FeedbackPanel>
            </div>
          )}
        </Card>

        {panel !== "none" && (
          <Card className="h-fit xl:sticky xl:top-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{panel === "tutor" ? "AI Tutor" : "Desmos calculator"}</h2>
              <button onClick={() => setPanel("none")} className="text-muted hover:text-ink" aria-label="Close panel">✕</button>
            </div>
            {panel === "tutor" ? (
              tutorAvailable ? (
                <TutorChat key={`${q.id}-${answered}`} sessionId={view.id} questionId={q.id} answered={answered} compact />
              ) : (
                <p className="text-sm text-muted">The AI tutor isn't set up on this server yet (no API key). Hints, worked explanations, and lessons all still work.</p>
              )
            ) : (
              <Desmos className="h-[28rem] w-full overflow-hidden rounded-xl border border-line" />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
