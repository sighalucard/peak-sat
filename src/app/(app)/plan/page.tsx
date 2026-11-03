import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOverview } from "@/lib/overview";
import { Badge, Card, LinkButton, PageHeader, cx } from "@/components/ui";
import { StartButton } from "@/components/start-button";

export const metadata = { title: "Study plan" };

export default async function Plan() {
  const user = await requireUser();
  const o = await getOverview(user.id);
  const p = o.student.profile;
  const total = o.plan.blocks.filter((b) => b.kind !== "fulltest").reduce((t, b) => t + b.minutes, 0);
  return (
    <div>
      <PageHeader
        title="Today's study plan"
        subtitle={<>About {total} minutes, built from your results{p?.dailyMinutes ? ` and your ${p.dailyMinutes}-minute daily goal` : ""}. It updates after every session. <Link className="font-semibold text-brand" href="/settings">Change your time or test date</Link></>}
      />
      {o.plan.notes.map((n) => <Card key={n} className="mb-4 border-brand/30 bg-brand-soft/40 text-sm">{n}</Card>)}
      <div className="space-y-3">
        {o.plan.blocks.map((b, i) => (
          <Card key={b.id} className={cx("flex flex-col gap-3 sm:flex-row sm:items-center", b.done && "opacity-70")}>
            <div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold", b.done ? "bg-good-soft text-good" : b.kind === "break" ? "bg-slate-100 text-muted" : "bg-brand-soft text-brand")}>{b.done ? "✓" : i + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{b.title}</span><Badge>{b.minutes} min</Badge>{b.done && <Badge tone="good">Done today</Badge>}</div>
              <p className="mt-0.5 text-sm text-muted">{b.why}</p>
            </div>
            {!b.done && b.kind !== "break" && (b.start ? <StartButton body={b.start}>Start</StartButton> : b.href ? <LinkButton href={b.href}>Open</LinkButton> : null)}
          </Card>
        ))}
      </div>
      <Card className="mt-6 text-sm text-muted">
        <h2 className="mb-1 font-semibold text-ink">How this plan is built</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Due reviews come first, because spaced retrieval is one of the best-supported study methods.</li>
          <li>Practice time goes to the skills with the largest expected score gain: how often they appear on the SAT × how much room you have to improve × whether practice is working.</li>
          <li>Skills you've mastered get only light upkeep, so you don't spend time where it won't help.</li>
          <li>If accuracy stalls despite practice, the plan suggests a concept lesson instead of more drilling.</li>
          <li>Timed work and full tests increase as your test date gets closer.</li>
          <li>Missed a day? Nothing piles up. Each day's plan fits your daily time.</li>
        </ul>
        <p className="mt-2"><Link href="/methods" className="font-semibold text-brand">Read the research behind these choices →</Link></p>
      </Card>
    </div>
  );
}
