import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { StartButton } from "@/components/start-button";
import type { SessionResult } from "@/lib/sessions";

export const metadata = { title: "Full SAT tests" };

export default async function Tests() {
  const user = await requireUser();
  const tests = await db.practiceSession.findMany({ where: { userId: user.id, kind: "fulltest" }, orderBy: { startedAt: "desc" } });
  const active = tests.find((t) => t.status === "active");
  return (
    <div>
      <PageHeader title="Full-length practice SAT" subtitle="Same structure and timing as the digital SAT: 2 hours 14 minutes of testing plus a 10-minute break." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <h2 className="font-semibold">How it works</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li><b>Reading and Writing:</b> 2 modules × 27 questions, 32 minutes each (54 questions, 64 minutes).</li>
            <li><b>10-minute break.</b></li>
            <li><b>Math:</b> 2 modules × 22 questions, 35 minutes each (44 questions, 70 minutes). Desmos calculator and reference sheet available throughout.</li>
            <li><b>Multistage adaptive:</b> your Module 1 accuracy decides whether Module 2 is easier or harder, just like the real test. In this simulator, 60% or more correct routes you to the harder module. College Board doesn't publish its real routing rule, so this threshold is our approximation.</li>
            <li><b>Test mode:</b> no hints, explanations, or AI tutor until you finish. You can mark questions for review, cross out choices, and move freely within a module.</li>
            <li>If you leave, your answers are saved and the timer pauses. (On test day it wouldn't.)</li>
          </ul>
          <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">Scores here are unofficial estimates. The questions are original SAT-style items that haven't been calibrated against real test-takers. For the closest prediction of your official score, also take College Board's free Bluebook practice tests.</p>
          <div className="mt-4">{active ? <Link href={`/session/${active.id}`} className="font-semibold text-brand">Resume your test in progress →</Link> : <StartButton body={{ kind: "fulltest" }}>Start a full-length test</StartButton>}</div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Past tests</h2>
          {tests.filter((t) => t.status === "completed").length === 0 ? <p className="text-sm text-muted">No completed tests yet.</p> : (
            <ul className="space-y-3">
              {tests.filter((t) => t.status === "completed").map((t) => {
                const r = JSON.parse(t.result!) as SessionResult;
                const total = (r.sectionScores?.RW?.score ?? 0) + (r.sectionScores?.MATH?.score ?? 0);
                return (
                  <li key={t.id} className="flex items-center justify-between">
                    <div><div className="font-semibold">{total} <span className="text-xs font-normal text-muted">est.</span></div><div className="text-xs text-muted">{t.completedAt?.toLocaleDateString()} · RW {r.sectionScores?.RW?.score} · Math {r.sectionScores?.MATH?.score}</div></div>
                    <Link href={`/session/${t.id}`} className="text-sm font-semibold text-brand">Review</Link>
                  </li>
                );
              })}
            </ul>
          )}
          {active && <Badge tone="warn" className="mt-3">1 test in progress</Badge>}
        </Card>
      </div>
    </div>
  );
}
