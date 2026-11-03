import { requireUser } from "@/lib/auth";
import { getOverview } from "@/lib/overview";
import { Badge, Card, PageHeader, cx, pct } from "@/components/ui";
import { StartButton } from "@/components/start-button";
import { DOMAINS, SKILLS } from "@/content/taxonomy";
import { QUESTIONS } from "@/content/bank";
import { TimedBuilder } from "./timed-builder";

export const metadata = { title: "Practice" };

export default async function Practice({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const { skill: focus } = await searchParams;
  const user = await requireUser();
  const o = await getOverview(user.id);
  const counts = new Map<string, number>();
  for (const q of QUESTIONS) counts.set(q.skill, (counts.get(q.skill) ?? 0) + 1);

  return (
    <div>
      <PageHeader title="Practice" subtitle="Untimed practice gives instant explanations, hints, and the AI tutor. Timed sets simulate test pace." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Smart practice</h2>
          <p className="mt-1 text-sm text-muted">Mixes your top-priority skills, with difficulty that adjusts to how you're doing. Mixing skills (interleaving) helps you learn to recognize which method a question needs.</p>
          <div className="mt-3"><StartButton body={{ kind: "practice", count: 10 }}>Start 10 questions</StartButton></div>
        </Card>
        <Card>
          <h2 className="font-semibold">Spaced review</h2>
          <p className="mt-1 text-sm text-muted">{o.due.length ? `${o.due.length} question${o.due.length === 1 ? " is" : "s are"} due: ones you missed, guessed, or needed hints on.` : "Nothing due right now. Missed questions come back here on a schedule."}</p>
          <div className="mt-3">{o.due.length ? <StartButton body={{ kind: "review" }}>Start review</StartButton> : <Badge tone="good">All caught up</Badge>}</div>
        </Card>
        <Card>
          <h2 className="font-semibold">Diagnostic</h2>
          <p className="mt-1 text-sm text-muted">24 questions across all 8 domains, about 30 minutes, untimed. Retake it any time for a fresh baseline.</p>
          <div className="mt-3"><StartButton variant="secondary" body={{ kind: "diagnostic" }}>Start diagnostic</StartButton></div>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-1 font-semibold">Timed practice</h2>
        <p className="mb-4 text-sm text-muted">Pick a scope and length. The default pace matches the real SAT (about 71 seconds per Reading and Writing question and 95 seconds per Math question). Results and explanations appear after you submit.</p>
        <TimedBuilder />
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Practice by skill</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {DOMAINS.map((d) => (
          <Card key={d.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{d.name}</h3>
              <Badge>{d.section === "RW" ? "Reading and Writing" : "Math"} · ~{Math.round(d.weight * 100)}% of section</Badge>
            </div>
            <ul className="divide-y divide-line">
              {SKILLS.filter((s) => s.domain === d.id).map((s) => {
                const st = o.student.states.get(s.id)!;
                return (
                  <li key={s.id} id={s.id} className={cx("flex flex-wrap items-center justify-between gap-2 py-2.5", focus === s.id && "rounded-lg bg-brand-soft/60 px-2")}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted">{st.n ? `Est. ${pct(st.mastery)} accuracy · ${st.n} answered` : "Not practiced yet"} · {counts.get(s.id) ?? 0} questions</div>
                    </div>
                    <StartButton variant={focus === s.id ? "primary" : "secondary"} body={{ kind: "practice", skill: s.id, count: 8 }}>Practice</StartButton>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
