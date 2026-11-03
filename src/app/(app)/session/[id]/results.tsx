import Link from "next/link";
import type { SessionView } from "@/lib/session-view";
import { Badge, Card, LinkButton, PageHeader, Progress, Stat, fmtDuration, pct } from "@/components/ui";
import { DOMAINS, domainName, mistakeLabel, sectionName, skillById, skillName } from "@/content/taxonomy";
import { ReviewList } from "./review-list";
import { ROUTING_THRESHOLD } from "@/lib/sessions";
import { requireUser } from "@/lib/auth";
import { loadStudent } from "@/lib/student";
import { recommend } from "@/lib/recommend";

export async function Results({ view }: { view: SessionView }) {
  const r = view.result!;
  const answered = r.correct + r.incorrect;
  const accuracy = r.total ? r.correct / r.total : 0;
  const slowSet = new Set(r.slow);
  const domains = DOMAINS.filter((d) => r.byDomain[d.id]);
  const weakSkills = Object.entries(r.bySkill).filter(([, [c, n]]) => n > 0 && c / n < 0.6).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);

  return (
    <div>
      <PageHeader
        title={view.kind === "diagnostic" ? "Your diagnostic report" : view.kind === "fulltest" ? "Full-length test results" : "Session results"}
        subtitle={view.title}
        actions={<><LinkButton href="/practice" variant="secondary">Back to practice</LinkButton><LinkButton href="/dashboard">Dashboard</LinkButton></>}
      />

      {view.kind === "fulltest" && r.sectionScores && <FullTestScores view={view} />}
      {view.kind === "diagnostic" && <DiagnosticReport view={view} />}

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          <Stat label="Accuracy" value={pct(accuracy)} hint={`${r.correct} of ${r.total}`} />
          <Stat label="Correct" value={r.correct} />
          <Stat label="Incorrect" value={r.incorrect} />
          <Stat label="Skipped" value={r.skipped} />
          <Stat label="Time" value={fmtDuration(r.timeMs)} hint={answered ? `${fmtDuration(r.timeMs / Math.max(1, answered))} per question` : undefined} />
        </div>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">By domain</h2>
          <div className="space-y-3">
            {domains.map((d) => {
              const [c, n] = r.byDomain[d.id];
              return (
                <div key={d.id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{d.name}</span><span className="tabular-nums text-muted">{c}/{n}</span></div>
                  <Progress value={(c / n) * 100} tone={c / n >= 0.75 ? "good" : c / n >= 0.5 ? "brand" : "bad"} label={d.name} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">What to work on</h2>
          {weakSkills.length === 0 ? (
            <p className="text-sm text-muted">No skill in this set fell below 60%. Your dashboard has the next priorities across everything you've practiced.</p>
          ) : (
            <ul className="space-y-2">
              {weakSkills.slice(0, 5).map(([skill, [c, n]]) => (
                <li key={skill} className="flex items-center justify-between gap-2 text-sm">
                  <span>{skillName(skill)} <span className="text-muted">({c}/{n})</span></span>
                  <span className="flex gap-2">
                    <Link className="font-semibold text-brand" href={`/lessons/${skill}`}>Lesson</Link>
                    <Link className="font-semibold text-brand" href={`/practice?skill=${skill}`}>Practice</Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {r.slow.length > 0 && <p className="mt-4 text-sm text-muted">{r.slow.length} question{r.slow.length === 1 ? "" : "s"} took more than 1.5× the expected time (marked ⏱ below).</p>}
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Question review</h2>
      <ReviewList sessionId={view.id} items={view.questions.map((x) => ({ ...x!, slow: slowSet.has(x!.q.id) }))} tutorAvailable={!!process.env.ANTHROPIC_API_KEY} />
    </div>
  );
}

function FullTestScores({ view }: { view: SessionView }) {
  const r = view.result!;
  const s = r.sectionScores!;
  const total = (s.RW?.score ?? 0) + (s.MATH?.score ?? 0);
  return (
    <Card className="mb-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <Stat label="Estimated total" value={`${total}`} hint={`Likely range ${(s.RW?.low ?? 0) + (s.MATH?.low ?? 0)}–${(s.RW?.high ?? 0) + (s.MATH?.high ?? 0)}`} />
        <Stat label="Reading and Writing" value={s.RW?.score} hint={`Range ${s.RW?.low}–${s.RW?.high}`} />
        <Stat label="Math" value={s.MATH?.score} hint={`Range ${s.MATH?.low}–${s.MATH?.high}`} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {r.routing?.map((x) => (
          <div key={x.section} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold">{sectionName(x.section)} routing</p>
            <p className="mt-1 text-muted">
              Module 1: {pct(x.m1Accuracy)} correct → {x.level === "harder" ? "harder" : "easier"} Module 2 (threshold {pct(ROUTING_THRESHOLD)}).
              {x.level === "easier" ? " On the real SAT, the easier second module limits the highest possible score, so strong Module 1 accuracy matters a lot." : " The harder module gives access to the top of the score range."}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-xs text-warn">
        <b>Unofficial estimate.</b> This test follows the official digital SAT structure (two adaptive modules per section with official timing), but its questions are not College Board–calibrated and College Board doesn't publish its routing or scoring rules. Treat these scores as a rough range, not a prediction of your official score. Official Bluebook practice tests are the most accurate predictor.
      </p>
    </Card>
  );
}

async function DiagnosticReport({ view }: { view: SessionView }) {
  const user = await requireUser();
  const student = await loadStudent(user.id);
  const r = view.result!;
  const attempts = student.attempts.filter((a) => a.sessionId === view.id);
  const sec = (s: "RW" | "MATH") => {
    const ids = view.questions.filter((x) => x!.q.section === s);
    const c = ids.filter((x) => x!.feedback?.correct).length;
    return { c, n: ids.length };
  };
  const rw = sec("RW"), m = sec("MATH");
  const skills = Object.entries(r.bySkill).map(([k, [c, n]]) => ({ k, c, n, p: c / n }));
  const strong = skills.filter((s) => s.p === 1 && s.n >= 1).sort((a, b) => b.n - a.n).slice(0, 4);
  const weak = skills.filter((s) => s.p < 0.5).sort((a, b) => a.p - b.p).slice(0, 5);
  const mistakeCounts = new Map<string, number>();
  for (const a of attempts) if (!a.correct && a.mistakeCategory) mistakeCounts.set(a.mistakeCategory, (mistakeCounts.get(a.mistakeCategory) ?? 0) + 1);
  const guessed = attempts.filter((a) => a.guessed);
  const luckyGuesses = guessed.filter((a) => a.correct).length;
  const recs = recommend(student.states).slice(0, 3);
  const est = student.estimates;

  return (
    <div className="mb-6 space-y-6">
      <Card>
        <h2 className="text-lg font-semibold">1. Overall performance</h2>
        <p className="mt-1 text-muted">{r.correct} of {r.total} correct ({pct(r.correct / r.total)}), covering all 8 SAT domains at three difficulty levels.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-semibold">2. Reading and Writing</h3>
            <p className="text-2xl font-bold">{rw.c}/{rw.n}</p>
            <p className="text-sm text-muted">{est.RW ? `Very rough early estimate: ${est.RW.low}–${est.RW.high}` : "More data needed for a score range."}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="font-semibold">3. Math</h3>
            <p className="text-2xl font-bold">{m.c}/{m.n}</p>
            <p className="text-sm text-muted">{est.MATH ? `Very rough early estimate: ${est.MATH.low}–${est.MATH.high}` : "More data needed for a score range."}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">With only 12 questions per section, these ranges are wide on purpose. They narrow as you practice. This diagnostic is not calibrated against official SAT scores.</p>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">4. Strongest skills</h2>
          {strong.length ? <ul className="mt-2 space-y-1 text-sm">{strong.map((s) => <li key={s.k}>✓ {skillName(s.k)} <span className="text-muted">({s.c}/{s.n})</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">No skill was fully correct yet. That's common on a first diagnostic.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">5. Weakest skills</h2>
          {weak.length ? <ul className="mt-2 space-y-1 text-sm">{weak.map((s) => <li key={s.k}>• {skillName(s.k)} <span className="text-muted">({s.c}/{s.n})</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">No skill fell below 50%.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">6. Common mistakes</h2>
          {mistakeCounts.size ? (
            <ul className="mt-2 space-y-1 text-sm">{[...mistakeCounts].sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k}>{mistakeLabel(k)}: <b>{n}</b></li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">No mistakes to categorize.</p>}
          <p className="mt-2 text-xs text-muted">These are suggested categories. Confirm or change them in the question review below so your mistake dashboard is accurate.</p>
          {guessed.length > 0 && <p className="mt-2 text-sm">You marked {guessed.length} guess{guessed.length === 1 ? "" : "es"}; {luckyGuesses} happened to be right. We'll bring those back for review, since a lucky guess isn't mastery.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">7. Skills to prioritize</h2>
          <ol className="mt-2 space-y-2 text-sm">
            {recs.map((x, i) => (
              <li key={x.skill}><b>{i + 1}. {skillName(x.skill)}</b> <span className="text-muted">({domainName(skillDomain(x.skill))})</span><br /><span className="text-muted">{x.reason}</span></li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">Ranked by how much each skill is likely to move your score: how often it appears on the SAT, your current accuracy, and room to improve.</p>
        </Card>
      </div>
      <Card>
        <h2 className="font-semibold">8. Recommended next steps</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>Open your <Link className="font-semibold text-brand" href="/plan">study plan</Link>. It's been built from these results and your available time.</li>
          <li>Start with <Link className="font-semibold text-brand" href={`/lessons/${recs[0]?.skill}`}>the {skillName(recs[0]?.skill ?? "")} lesson</Link>, then do targeted practice on it.</li>
          <li>Review the questions you missed below. Reading why the wrong answers are wrong is one of the most effective ways to improve.</li>
          <li>Take a full-length practice test after a week or two of targeted practice to check progress under timed conditions.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/plan">See my study plan</LinkButton>
          {recs[0] && <LinkButton variant="secondary" href={`/practice?skill=${recs[0].skill}`}>Practice {skillName(recs[0].skill)}</LinkButton>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">{DOMAINS.map((d) => <Badge key={d.id}>{d.name}</Badge>)}</div>
      </Card>
    </div>
  );
}

function skillDomain(skill: string) {
  return skillById.get(skill)?.domain ?? "";
}
