import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadStudent } from "@/lib/student";
import { dueReviews } from "@/lib/srs";
import { getQuestion } from "@/content/bank";
import { Badge, Card, Empty, PageHeader, pct } from "@/components/ui";
import { Bars } from "@/components/charts";
import { StartButton } from "@/components/start-button";
import { MISTAKE_CATEGORIES, mistakeLabel, skillName, skillTestWeight } from "@/content/taxonomy";

export const metadata = { title: "Mistake review" };

export default async function Mistakes() {
  const user = await requireUser();
  const student = await loadStudent(user.id);
  const wrong = student.attempts.filter((a) => !a.correct && a.selected);
  const due = await dueReviews(user.id, new Date(), 100);
  const saved = await db.savedQuestion.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  if (student.attempts.length === 0) {
    return <div><PageHeader title="Mistake review" /><Empty title="No mistakes yet">Once you practice, every missed question is logged and categorized here, with patterns and targeted review.</Empty></div>;
  }

  const byCat = MISTAKE_CATEGORIES.map((c) => ({ ...c, n: wrong.filter((a) => a.mistakeCategory === c.id).length })).filter((c) => c.n).sort((a, b) => b.n - a.n);
  const confirmedShare = wrong.length ? wrong.filter((a) => a.mistakeConfirmed).length / wrong.length : 0;

  // Skills where mistakes cost the most: weight on the test × miss count recently.
  const recent = student.attempts.slice(-200);
  const bySkill = new Map<string, { c: number; n: number; slow: number; timed: number }>();
  for (const a of recent) {
    const s = bySkill.get(a.skill) ?? { c: 0, n: 0, slow: 0, timed: 0 };
    s.n++; if (a.correct) s.c++; if (a.overTime) s.slow++; if (!a.correct && a.mistakeCategory === "time") s.timed++;
    bySkill.set(a.skill, s);
  }
  const impact = [...bySkill].map(([k, s]) => ({ k, ...s, acc: s.c / s.n, impact: skillTestWeight(k) * (s.n - s.c) })).filter((x) => x.n - x.c > 0).sort((a, b) => b.impact - a.impact);

  // Questions missed more than once.
  const missCount = new Map<string, number>();
  for (const a of wrong) missCount.set(a.questionId, (missCount.get(a.questionId) ?? 0) + 1);
  const repeated = [...missCount].filter(([, n]) => n >= 2).map(([id, n]) => ({ q: getQuestion(id), n })).filter((x) => x.q);

  // Improved: skills whose estimated mastery rose by 10+ points.
  const improved = [...student.states.values()].filter((s) => s.masteryEarlier != null && s.mastery - s.masteryEarlier >= 0.1);
  const slow = student.attempts.filter((a) => a.overTime).slice(-8).reverse();

  return (
    <div>
      <PageHeader title="Mistake review" subtitle="Patterns in what you miss, and the fastest way to fix them." actions={due.length ? <StartButton body={{ kind: "review" }}>Review {Math.min(15, due.length)} due questions</StartButton> : undefined} />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold">Most frequent mistake types</h2>
          <p className="mb-4 text-xs text-muted">{pct(confirmedShare)} confirmed by you; the rest are our suggestions. Confirming them on result pages makes this more accurate.</p>
          {byCat.length ? <Bars rows={byCat.map((c) => ({ label: c.label, value: c.n / wrong.length, n: c.n }))} /> : <p className="text-sm text-muted">No categorized mistakes yet.</p>}
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Where mistakes cost you the most</h2>
          <p className="mb-4 text-xs text-muted">Ranked by misses × how often the skill appears on the SAT (your last 200 questions).</p>
          <ul className="space-y-3">
            {impact.slice(0, 6).map((x) => (
              <li key={x.k} className="flex items-center justify-between gap-2 text-sm">
                <div><div className="font-medium">{skillName(x.k)}</div><div className="text-xs text-muted">{pct(x.acc)} accuracy · {x.n - x.c} missed{x.slow ? ` · ${x.slow} slow` : ""}</div></div>
                <div className="flex shrink-0 gap-2"><Link className="text-sm font-semibold text-brand" href={`/lessons/${x.k}`}>Lesson</Link><StartButton variant="secondary" body={{ kind: "practice", skill: x.k, count: 8 }}>Fix it</StartButton></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-semibold">Missed more than once</h2>
          {repeated.length ? <ul className="space-y-2 text-sm">{repeated.slice(0, 8).map(({ q, n }) => <li key={q!.id}><Badge tone="bad">{n}×</Badge> {skillName(q!.skill)}: <span className="text-muted">{q!.stem.slice(0, 70)}…</span></li>)}</ul> : <p className="text-sm text-muted">None. Missed questions come back in spaced review, often swapped for a similar question so you learn the concept rather than the answer.</p>}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Improved concepts</h2>
          {improved.length ? <ul className="space-y-2 text-sm">{improved.map((s) => <li key={s.skill}>📈 {skillName(s.skill)}: {pct(s.masteryEarlier!)} → <b>{pct(s.mastery)}</b></li>)}</ul> : <p className="text-sm text-muted">Keep practicing. Skills that improve by 10+ points show up here.</p>}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Took too long</h2>
          {slow.length ? <ul className="space-y-2 text-sm">{slow.map((a) => <li key={a.id}>{skillName(a.skill)} <span className="text-muted">· {Math.round(a.timeMs / 1000)}s ({a.correct ? "correct" : "missed"}{a.mistakeCategory === "time" ? ", time pressure" : ""})</span></li>)}</ul> : <p className="text-sm text-muted">No questions over 2× the expected time.</p>}
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Saved questions</h2>
        {saved.length ? (
          <ul className="space-y-2 text-sm">{saved.map((s) => { const q = getQuestion(s.questionId); return q ? <li key={s.questionId}>★ {skillName(q.skill)}: <span className="text-muted">{q.stem.slice(0, 90)}…</span></li> : null; })}</ul>
        ) : <p className="text-sm text-muted">Use ☆ Save on any practice question to keep it here.</p>}
      </Card>
      <p className="mt-4 text-xs text-muted">Categories: {MISTAKE_CATEGORIES.map((c) => mistakeLabel(c.id)).join(" · ")}</p>
    </div>
  );
}
