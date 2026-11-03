"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

type S = { name: string; currentScore: number | null; targetScore: number | null; testDate: string; dailyMinutes: number; weeklyGoalMin: number | null; hintDelayFactor: number; autoHintNudges: boolean };

export function SettingsForm({ initial }: { initial: S }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));

  async function save() {
    setMsg(null);
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, testDate: s.testDate || null }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, text: "Saved. Your plan and dashboard now use these settings." } : { ok: false, text: d.details?.[0] ?? d.error ?? "Couldn't save." });
    if (r.ok) router.refresh();
  }
  const field = "mt-1 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-brand";

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="font-semibold">Goals</h2>
        <label className="block text-sm font-medium">Name<input className={field} value={s.name} onChange={(e) => set("name", e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Current score (400–1600)<input type="number" min={400} max={1600} step={10} className={field} value={s.currentScore ?? ""} onChange={(e) => set("currentScore", num(e.target.value))} /></label>
          <label className="block text-sm font-medium">Target score (400–1600)<input type="number" min={400} max={1600} step={10} className={field} value={s.targetScore ?? ""} onChange={(e) => set("targetScore", num(e.target.value))} /></label>
          <label className="block text-sm font-medium">Test date<input type="date" className={field} value={s.testDate} onChange={(e) => set("testDate", e.target.value)} /></label>
          <label className="block text-sm font-medium">Daily study time (minutes)<input type="number" min={10} max={240} className={field} value={s.dailyMinutes} onChange={(e) => set("dailyMinutes", Number(e.target.value) || 30)} /></label>
          <label className="block text-sm font-medium">Weekly goal (minutes, optional)<input type="number" min={30} max={1500} className={field} value={s.weeklyGoalMin ?? ""} onChange={(e) => set("weeklyGoalMin", num(e.target.value))} /></label>
        </div>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-semibold">Hints</h2>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4" checked={s.autoHintNudges} onChange={(e) => set("autoHintNudges", e.target.checked)} />Offer a hint when I've been stuck for a while (only when I'm idle, never automatically revealed)</label>
        <label className="block text-sm font-medium">
          When to offer hints: {s.hintDelayFactor === 1 ? "at the expected solving time" : `${s.hintDelayFactor}× the expected solving time`}
          <input type="range" min={0.5} max={3} step={0.25} value={s.hintDelayFactor} onChange={(e) => set("hintDelayFactor", Number(e.target.value))} className="mt-2 w-full" />
          <span className="flex justify-between text-xs text-muted"><span>Sooner</span><span>Later</span></span>
        </label>
      </Card>
      {msg && <p role="status" className={msg.ok ? "rounded-xl bg-good-soft px-3 py-2 text-sm text-good" : "rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad"}>{msg.text}</p>}
      <Button onClick={save}>Save settings</Button>
    </div>
  );
}
