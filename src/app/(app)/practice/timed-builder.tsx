"use client";
import { useState } from "react";
import { DOMAINS, SKILLS } from "@/content/taxonomy";
import { StartButton } from "@/components/start-button";

export function TimedBuilder() {
  const [scope, setScope] = useState("section:MATH");
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const [kind, val] = scope.split(":");
  const section = kind === "section" ? val : kind === "domain" ? DOMAINS.find((d) => d.id === val)!.section : DOMAINS.find((d) => d.id === SKILLS.find((s) => s.id === val)!.domain)!.section;
  const pace = section === "RW" ? 71 : 95;
  const body = {
    kind: "timed", count,
    ...(kind === "section" ? { section: val } : kind === "domain" ? { domain: val } : { skill: val }),
    timeLimitSec: timed ? count * pace : null,
  };
  const fullSection = section === "RW" ? { n: 27, min: 32 } : { n: 22, min: 35 };
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="mb-1 block font-medium">Scope</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <optgroup label="Section"><option value="section:RW">Reading and Writing</option><option value="section:MATH">Math</option></optgroup>
          <optgroup label="Domain">{DOMAINS.map((d) => <option key={d.id} value={`domain:${d.id}`}>{d.name}</option>)}</optgroup>
          <optgroup label="Skill">{SKILLS.map((s) => <option key={s.id} value={`skill:${s.id}`}>{s.name}</option>)}</optgroup>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Questions</span>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-xl border border-line bg-surface px-3 py-2.5">
          {[1, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          {kind === "section" && <option value={fullSection.n}>{fullSection.n} (one full module)</option>}
        </select>
      </label>
      <label className="flex items-center gap-2 pb-2.5 text-sm">
        <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4" />
        Timed ({Math.round((count * pace) / 60)} min{kind === "section" && count === fullSection.n ? `, official module time is ${fullSection.min} min` : ""})
      </label>
      <StartButton body={kind === "section" && count === fullSection.n && timed ? { ...body, timeLimitSec: fullSection.min * 60 } : body}>Start timed set</StartButton>
    </div>
  );
}
