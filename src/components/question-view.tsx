"use client";
import type { PublicQuestion } from "@/content/types";
import { cx } from "./ui";
import type { Feedback } from "@/lib/feedback";

export function DataTable({ table }: { table: NonNullable<PublicQuestion["table"]> }) {
  return (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        {table.caption && <caption className="mb-1 text-left text-xs font-semibold text-muted">{table.caption}</caption>}
        <thead>
          <tr>{table.headers.map((h, i) => <th key={i} className="border border-line bg-slate-50 px-3 py-1.5 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border border-line px-3 py-1.5 tabular-nums">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function Passage({ q }: { q: PublicQuestion }) {
  if (!q.passage && !q.table) return null;
  return (
    <div className="space-y-4">
      {q.passage && <div className="passage">{q.passage}</div>}
      {q.passage2 && <div className="passage border-t border-line pt-4">{q.passage2}</div>}
      {q.table && <DataTable table={q.table} />}
    </div>
  );
}

export function Choices({
  q, value, onChange, eliminated, onEliminate, feedback, disabled,
}: {
  q: PublicQuestion; value: string; onChange: (v: string) => void; eliminated: string[]; onEliminate?: (l: string) => void; feedback?: Feedback | null; disabled?: boolean;
}) {
  if (q.type === "spr") {
    return (
      <div className="max-w-xs">
        <label className="text-sm font-medium" htmlFor={`spr-${q.id}`}>Your answer</label>
        <input id={`spr-${q.id}`} value={value} disabled={disabled} inputMode="decimal" maxLength={7} onChange={(e) => onChange(e.target.value.replace(/[^\d./\-−]/g, ""))}
          className={cx("mt-1 w-full rounded-xl border-2 px-4 py-3 font-mono text-lg outline-none", feedback ? (feedback.correct ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-line focus:border-brand")}
          placeholder="Type a number" />
        <p className="mt-1 text-xs text-muted">Enter a number, fraction (like 3/4), or decimal. Negative answers start with a minus sign.</p>
        {feedback && !feedback.correct && <p className="mt-2 text-sm">Correct answer: <span className="font-mono font-semibold">{feedback.answer}</span></p>}
      </div>
    );
  }
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Answer choices">
      {q.choices!.map((c, i) => {
        const L = "ABCD"[i];
        const isEl = eliminated.includes(L);
        const selected = value === L;
        const fc = feedback?.choices?.[i];
        const tone = feedback ? (fc?.correct ? "good" : selected ? "bad" : "none") : "none";
        return (
          <div key={L} className="flex items-stretch gap-2">
            <button type="button" role="radio" aria-checked={selected} disabled={disabled}
              onClick={() => onChange(L)}
              className={cx(
                "flex flex-1 items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                tone === "good" ? "border-good bg-good-soft" : tone === "bad" ? "border-bad bg-bad-soft" : selected ? "border-brand bg-brand-soft" : "border-line hover:border-slate-300",
                isEl && !feedback && "opacity-50",
              )}>
              <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-semibold", selected ? "border-brand bg-brand text-white" : "border-slate-300")}>{L}</span>
              <span className={cx("pt-0.5", isEl && !feedback && "line-through")}>{c.text}</span>
            </button>
            {onEliminate && !feedback && (
              <button type="button" onClick={() => onEliminate(L)} aria-pressed={isEl} aria-label={`${isEl ? "Restore" : "Eliminate"} choice ${L}`} title={isEl ? "Restore choice" : "Cross out choice"}
                className={cx("w-10 shrink-0 rounded-xl border text-sm font-semibold", isEl ? "border-slate-400 bg-slate-100" : "border-line text-slate-400 hover:text-ink")}>
                <span className="line-through">{L}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FeedbackPanel({ fb, children }: { fb: Feedback; children?: React.ReactNode }) {
  return (
    <div className="space-y-4 fade-in">
      <div className={cx("rounded-xl px-4 py-3 font-semibold", fb.correct ? "bg-good-soft text-good" : "bg-bad-soft text-bad")}>
        {fb.correct ? "Correct!" : fb.response ? `Not quite. The correct answer is ${fb.answer}.` : `Not answered. The correct answer is ${fb.answer}.`}
      </div>
      {fb.choices && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Why each choice is right or wrong</h3>
          {fb.choices.map((c) => (
            <div key={c.letter} className={cx("rounded-xl border px-4 py-2.5 text-sm", c.correct ? "border-good/40 bg-good-soft/50" : fb.response === c.letter ? "border-bad/40 bg-bad-soft/50" : "border-line")}>
              <span className="font-semibold">{c.letter}{c.correct ? " ✓" : fb.response === c.letter ? " (your answer)" : ""}:</span> {c.rationale}
            </div>
          ))}
        </div>
      )}
      {!fb.choices && fb.trapRationale && <div className="rounded-xl border border-bad/30 bg-bad-soft/50 px-4 py-2.5 text-sm"><span className="font-semibold">About your answer:</span> {fb.trapRationale}</div>}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Step-by-step explanation</h3>
        <div className="prose-line mt-1 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed">{fb.explanation}</div>
      </div>
      <div className="rounded-xl border border-brand/20 bg-brand-soft/60 px-4 py-3 text-sm">
        <span className="font-semibold text-brand">Recognize it next time: </span>{fb.takeaway}
      </div>
      {children}
    </div>
  );
}
