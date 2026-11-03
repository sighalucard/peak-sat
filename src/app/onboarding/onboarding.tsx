"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, cx } from "@/components/ui";

type Answers = {
  currentScore: number | null; targetScore: number | null; testDate: string | null; dailyMinutes: number | null;
  strongest: "RW" | "MATH" | null; weakest: "RW" | "MATH" | null; takenBefore: boolean | null;
};

const STEPS = ["score", "target", "date", "time", "sections", "before"] as const;

export function Onboarding({ name }: { name: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ currentScore: null, targetScore: null, testDate: null, dailyMinutes: null, strongest: null, weakest: null, takenBefore: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((p) => ({ ...p, [k]: v }));
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());

  async function finish(goDiagnostic = false) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...a, onboarded: true }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.details?.[0] ?? d.error ?? "Couldn't save. Please try again.");
      setBusy(false);
      return;
    }
    if (goDiagnostic) {
      const s = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "diagnostic" }) });
      const d = await s.json();
      if (s.ok) return router.push(`/session/${d.id}`);
    }
    router.push("/dashboard");
    router.refresh();
  }

  const scoreInput = (k: "currentScore" | "targetScore", placeholder: string) => (
    <input type="number" min={400} max={1600} step={10} placeholder={placeholder} value={a[k] ?? ""}
      onChange={(e) => set(k, e.target.value ? Math.round(Number(e.target.value) / 10) * 10 : null)}
      className="w-full rounded-xl border border-line px-4 py-3 text-lg outline-none focus:border-brand" />
  );
  const choice = (selected: boolean, onClick: () => void, label: string) => (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cx("rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors", selected ? "border-brand bg-brand-soft text-brand" : "border-line hover:border-slate-300")}>
      {label}
    </button>
  );

  const s = STEPS[step];
  const valid = (s !== "score" || a.currentScore == null || (a.currentScore >= 400 && a.currentScore <= 1600)) && (s !== "target" || a.targetScore == null || (a.targetScore >= 400 && a.targetScore <= 1600));

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => <div key={i} className={cx("h-1.5 flex-1 rounded-full", i <= step ? "bg-brand" : "bg-slate-200")} />)}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm fade-in" key={s}>
          <p className="text-sm font-semibold text-brand">Step {step + 1} of {STEPS.length}</p>
          {s === "score" && (<>
            <h1 className="mt-1 text-2xl font-bold">{name ? `Hi ${name}! ` : ""}What's your current SAT score?</h1>
            <p className="mt-1 mb-4 text-muted">An official score or a practice-test estimate both work. Skip it if you don't know. The diagnostic will estimate it.</p>
            {scoreInput("currentScore", "e.g. 1150")}
          </>)}
          {s === "target" && (<>
            <h1 className="mt-1 text-2xl font-bold">What score are you aiming for?</h1>
            <p className="mt-1 mb-4 text-muted">We'll measure progress against this. You can change it any time.</p>
            {scoreInput("targetScore", "e.g. 1400")}
          </>)}
          {s === "date" && (<>
            <h1 className="mt-1 text-2xl font-bold">When is your test?</h1>
            <p className="mt-1 mb-4 text-muted">Your plan shifts toward timed practice and full tests as the date gets closer.</p>
            <input type="date" value={a.testDate ?? ""} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("testDate", e.target.value || null)} className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand" />
          </>)}
          {s === "time" && (<>
            <h1 className="mt-1 text-2xl font-bold">How much time can you study on a typical day?</h1>
            <p className="mt-1 mb-4 text-muted">Be realistic. A plan you can keep beats an ambitious one you skip.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[15, 20, 30, 45, 60, 90].map((m) => choice(a.dailyMinutes === m, () => set("dailyMinutes", m), `${m} minutes`))}
            </div>
          </>)}
          {s === "sections" && (<>
            <h1 className="mt-1 text-2xl font-bold">Which section feels stronger?</h1>
            <p className="mt-1 mb-4 text-muted">Your best guess is fine. Real data from practice will take over quickly.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {choice(a.strongest === "RW", () => setA((p) => ({ ...p, strongest: "RW", weakest: "MATH" })), "Reading and Writing")}
              {choice(a.strongest === "MATH", () => setA((p) => ({ ...p, strongest: "MATH", weakest: "RW" })), "Math")}
              {choice(a.strongest === null && a.weakest === null, () => setA((p) => ({ ...p, strongest: null, weakest: null })), "About the same / not sure")}
            </div>
          </>)}
          {s === "before" && (<>
            <h1 className="mt-1 text-2xl font-bold">Have you taken the SAT before?</h1>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {choice(a.takenBefore === true, () => set("takenBefore", true), "Yes")}
              {choice(a.takenBefore === false, () => set("takenBefore", false), "Not yet")}
            </div>
          </>)}
          {error && <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          <div className="mt-6 flex items-center justify-between gap-2">
            <button type="button" onClick={() => (step > 0 ? setStep(step - 1) : null)} className={cx("text-sm text-muted hover:text-ink", step === 0 && "invisible")}>Back</button>
            <div className="flex gap-2">
              {step < STEPS.length - 1 && <Button variant="ghost" onClick={() => setStep(step + 1)}>Skip</Button>}
              {step < STEPS.length - 1 ? <Button onClick={next} disabled={!valid}>Continue</Button> : null}
            </div>
          </div>
          {step === STEPS.length - 1 && (
            <div className="mt-6 space-y-2 border-t border-line pt-5">
              <p className="text-sm text-muted">Next, a 24-question diagnostic (about 30 minutes, untimed) measures every SAT domain so your plan is based on real data.</p>
              <Button className="w-full" disabled={busy} onClick={() => finish(true)}>{busy ? "Saving…" : "Save and start the diagnostic"}</Button>
              <Button variant="secondary" className="w-full" disabled={busy} onClick={() => finish(false)}>Save and go to my dashboard</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
