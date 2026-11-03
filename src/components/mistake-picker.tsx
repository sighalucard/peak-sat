"use client";
import { useState } from "react";
import { MISTAKE_CATEGORIES } from "@/content/taxonomy";
import { cx } from "./ui";

export function MistakePicker({ attemptId, suggested, confirmed: initiallyConfirmed }: { attemptId: string; suggested: string | null; confirmed: boolean }) {
  const [value, setValue] = useState(suggested);
  const [confirmed, setConfirmed] = useState(initiallyConfirmed);
  const [error, setError] = useState(false);
  async function choose(id: string) {
    setValue(id);
    setError(false);
    const r = await fetch(`/api/attempts/${attemptId}/category`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: id }) });
    if (r.ok) setConfirmed(true);
    else setError(true);
  }
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="text-sm font-semibold">What went wrong?</p>
      <p className="mt-0.5 text-xs text-muted">
        {confirmed ? "Saved. This feeds your mistake dashboard." : suggested ? "Our guess is highlighted, based on the answer you picked and your timing. Only you know what you were thinking, so please confirm or change it." : "Pick the closest reason. It helps target your review."}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {MISTAKE_CATEGORIES.map((m) => (
          <button key={m.id} onClick={() => choose(m.id)} aria-pressed={value === m.id}
            className={cx("rounded-full border px-2.5 py-1 text-xs", value === m.id ? (confirmed ? "border-brand bg-brand text-white" : "border-brand bg-brand-soft text-brand") : "border-line text-muted hover:border-slate-300")}>
            {m.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-bad">Couldn't save. Try again.</p>}
    </div>
  );
}
