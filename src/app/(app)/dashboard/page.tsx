import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOverview } from "@/lib/overview";
import { Badge, Card, LinkButton, PageHeader, Progress, Stat, pct } from "@/components/ui";
import { StartButton } from "@/components/start-button";
import { skillName, sectionName } from "@/content/taxonomy";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const o = await getOverview(user.id);
  const est = o.student.estimates;
  const first = o.student.attempts.length === 0;
  const next = o.plan.blocks.find((b) => !b.done && b.kind !== "break");
  const focus = o.recs.slice(0, 3);
  const p = o.student.profile;
  const daysToTest = p?.testDate ? Math.ceil((p.testDate.getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      <PageHeader
        title={`Hi${user.name ? `, ${user.name}` : ""}`}
        subtitle={daysToTest != null && daysToTest >= 0 ? `${daysToTest} day${daysToTest === 1 ? "" : "s"} until your SAT.` : "Here's where you stand and what to do next."}
      />

      {o.active.length > 0 && (
        <Card className="mb-6 border-brand/30 bg-brand-soft/40">
          <p className="font-semibold">Pick up where you left off</p>
          <ul className="mt-2 space-y-1 text-sm">
            {o.active.slice(0, 3).map((s) => <li key={s.id}><Link className="font-semibold text-brand" href={`/session/${s.id}`}>{s.title} →</Link> <span className="text-muted">started {s.startedAt.toLocaleDateString()}</span></li>)}
          </ul>
        </Card>
      )}

      {first ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold">Start with the diagnostic</h2>
          <p className="mt-1 text-muted">You haven't answered any questions yet, so there's no score estimate or plan to show. The 24-question diagnostic covers every SAT domain and takes about 30 minutes.</p>
          <div className="mt-4 flex flex-wrap gap-2"><StartButton body={{ kind: "diagnostic" }}>Start diagnostic</StartButton><LinkButton variant="secondary" href="/practice">Browse practice instead</LinkButton></div>
        </Card>
      ) : (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Estimated score range</div>
                {o.estTotal ? (
                  <div className="mt-1 text-4xl font-bold tabular-nums">{o.estTotal.low}–{o.estTotal.high}</div>
                ) : (
                  <div className="mt-1 text-lg font-semibold text-muted">Not enough data yet</div>
                )}
                <p className="mt-1 max-w-md text-xs text-muted">Unofficial estimate from your practice so far. The range narrows as you answer more questions. {o.estTotal ? "" : "Answer at least 8 questions in each section to see one."}</p>
              </div>
              {o.target && (
                <div className="min-w-40">
                  <Stat label="Target" value={o.target} />
                  {o.estTotal && <><Progress className="mt-2" value={((o.estTotal.low - 400) / (o.target - 400)) * 100} label="Progress to target" /><p className="mt-1 text-xs text-muted">{o.estTotal.low >= o.target ? "Your range has reached your target!" : `About ${o.target - o.estTotal.mid} points to go (from the middle of your range)`}</p></>}
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(["RW", "MATH"] as const).map((s) => (
                <div key={s} className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold">{sectionName(s)}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{est[s] ? `${est[s]!.low}–${est[s]!.high}` : "–"}</div>
                  <div className="text-xs text-muted">{est[s] ? `${est[s]!.n} questions answered` : "Needs more questions"}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="grid grid-cols-2 gap-5">
              <Stat label="Streak" value={`${o.streak} 🔥`} hint={`Best: ${o.bestStreak} day${o.bestStreak === 1 ? "" : "s"}`} />
              <Stat label="XP" value={o.xp.toLocaleString()} hint="Earned by correct, hint-free solves" />
              <Stat label="This week" value={`${o.weekMinutes} min`} hint={p?.weeklyGoalMin ? `Goal: ${p.weeklyGoalMin} min` : "Active question time"} />
              <Stat label="Due reviews" value={o.due.length} />
            </div>
            {p?.weeklyGoalMin ? <Progress className="mt-4" value={(o.weekMinutes / p.weeklyGoalMin) * 100} tone="good" label="Weekly goal" /> : null}
          </Card>
        </div>
      )}

      {!first && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Do this next</h2><Link href="/plan" className="text-sm font-semibold text-brand">Full plan →</Link></div>
            {next ? (
              <div>
                <p className="font-medium">{next.title} <span className="text-sm text-muted">· {next.minutes} min</span></p>
                <p className="mt-1 text-sm text-muted">{next.why}</p>
                <div className="mt-3">{next.start ? <StartButton body={next.start}>Start</StartButton> : next.href ? <LinkButton href={next.href}>Open</LinkButton> : null}</div>
              </div>
            ) : <p className="text-sm text-muted">You've finished today's plan. Nice work! Extra practice is optional.</p>}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Biggest opportunities</h2>
            <ul className="space-y-3">
              {focus.map((r) => (
                <li key={r.skill}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{skillName(r.skill)}</span>
                    <Badge tone={r.n < 3 ? "neutral" : r.mastery < 0.5 ? "bad" : "warn"}>{r.n < 3 ? "needs data" : pct(r.mastery)}</Badge>
                  </div>
                  <p className="text-xs text-muted">{r.reason}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
