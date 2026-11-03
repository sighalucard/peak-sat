import { requireUser } from "@/lib/auth";
import { getOverview } from "@/lib/overview";
import { scoreHistory } from "@/lib/history";
import { sectionPriors } from "@/lib/student";
import { Badge, Card, Empty, PageHeader, Stat, cx, fmtDuration, pct } from "@/components/ui";
import { Bars, LineChart } from "@/components/charts";
import { DOMAINS, SKILLS, sectionName } from "@/content/taxonomy";
import type { SessionResult } from "@/lib/sessions";
import Link from "next/link";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireUser();
  const o = await getOverview(user.id);
  const at = o.student.attempts;
  if (!at.length) return <div><PageHeader title="Progress" /><Empty title="No data yet">Your graphs fill in as you practice. <Link className="font-semibold text-brand" href="/practice">Start practicing</Link></Empty></div>;

  const priors = sectionPriors(o.student.profile);
  const hist = { RW: scoreHistory(at, priors, "RW"), MATH: scoreHistory(at, priors, "MATH") };
  const acc = (xs: typeof at) => (xs.length ? xs.filter((a) => a.correct).length / xs.length : 0);
  const avgTime = at.reduce((t, a) => t + a.timeMs, 0) / at.length;
  const hinted = at.filter((a) => a.hintsUsed > 0);
  const recentSessions = o.completed.slice(0, 8);

  return (
    <div>
      <PageHeader title="Progress" subtitle="How your skills and estimated scores are changing." />
      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          <Stat label="Questions" value={at.length} />
          <Stat label="Accuracy" value={pct(acc(at))} hint={`Last 50: ${pct(acc(at.slice(-50)))}`} />
          <Stat label="Avg. time" value={fmtDuration(avgTime)} hint="per question" />
          <Stat label="Hint use" value={pct(hinted.length / at.length)} hint={hinted.length ? `${pct(acc(hinted))} correct after hints` : undefined} />
          <Stat label="Skills mastered" value={o.mastered.length} hint={`of ${SKILLS.length}`} />
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {(["RW", "MATH"] as const).map((s) => (
          <Card key={s}>
            <h2 className="font-semibold">{sectionName(s)}: estimated score</h2>
            <p className="mb-3 text-xs text-muted">Line = middle of the estimate; shaded band = likely range. Unofficial and uncalibrated.</p>
            {hist[s].length ? <LineChart points={hist[s]} min={200} max={800} ariaLabel={`${sectionName(s)} estimated score over time`} /> : <p className="py-8 text-center text-sm text-muted">Answer at least 8 {sectionName(s)} questions to see an estimate.</p>}
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-4 font-semibold">Accuracy by domain</h2>
          <Bars rows={DOMAINS.map((d) => { const xs = at.filter((a) => a.domain === d.id); return { label: d.name, value: acc(xs), n: xs.length }; })} />
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Skill mastery</h2>
          <p className="mb-4 text-xs text-muted">Estimated chance of answering a medium question correctly. Our own model, which needs at least a few questions per skill.</p>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {SKILLS.map((s) => o.student.states.get(s.id)!).sort((a, b) => b.n - a.n).map((st) => {
              const sk = SKILLS.find((s) => s.id === st.skill)!;
              const trend = st.masteryEarlier != null ? st.mastery - st.masteryEarlier : 0;
              return (
                <div key={st.skill} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{sk.name}</span>
                  {st.n ? <>
                    <span className={cx("text-xs", trend > 0.03 ? "text-good" : trend < -0.03 ? "text-bad" : "text-muted")}>{trend > 0.03 ? "▲" : trend < -0.03 ? "▼" : "•"}</span>
                    <span className="w-10 text-right tabular-nums">{pct(st.mastery)}</span>
                    <span className="w-14 text-right text-xs text-muted">{st.n} q</span>
                  </> : <span className="text-xs text-muted">no data</span>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-3 font-semibold">Recent sessions</h2>
          <ul className="divide-y divide-line">
            {recentSessions.map((s) => { const r = JSON.parse(s.result!) as SessionResult; return (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/session/${s.id}`} className="font-medium hover:text-brand">{s.title}</Link>
                <span className="text-muted">{r.correct}/{r.total} · {s.completedAt?.toLocaleDateString()}</span>
              </li>
            ); })}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Achievements</h2>
          <div className="grid grid-cols-2 gap-2">
            {o.badges.map((b) => (
              <div key={b.id} className={cx("rounded-xl border px-3 py-2", b.earned ? "border-brand/30 bg-brand-soft/50" : "border-line opacity-60")}>
                <div className="text-sm font-semibold">{b.earned ? "🏅 " : ""}{b.label}</div>
                <div className="text-xs text-muted">{b.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><Badge>Streak: {o.streak} day{o.streak === 1 ? "" : "s"}</Badge><Badge>Best: {o.bestStreak}</Badge><Badge>{o.xp} XP</Badge></div>
        </Card>
      </div>
    </div>
  );
}
