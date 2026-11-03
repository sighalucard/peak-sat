import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { lessonById } from "@/content/lessons";
import { domainName, skillById } from "@/content/taxonomy";
import { Card, PageHeader } from "@/components/ui";
import { StartButton } from "@/components/start-button";
import { CompleteLesson } from "./complete";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const l = lessonById.get(id);
  if (!l) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/lessons" className="text-sm text-muted hover:text-ink">← All lessons</Link>
      <PageHeader title={l.title} subtitle={`${domainName(skillById.get(id)!.domain)} · ${l.minutes} min`} />
      <Card className="mb-4"><p className="text-lg leading-relaxed">{l.idea}</p></Card>
      <Card className="mb-4">
        <h2 className="mb-2 font-semibold">How to do it</h2>
        <ol className="list-decimal space-y-2 pl-5">{l.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Card>
      <Card className="mb-4">
        <h2 className="mb-2 font-semibold">Worked example</h2>
        <p className="prose-line rounded-xl bg-slate-50 px-4 py-3">{l.example.problem}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Try it first, then show the solution</summary>
          <p className="prose-line mt-2 rounded-xl bg-good-soft px-4 py-3">{l.example.solution}</p>
        </details>
      </Card>
      <Card className="mb-6">
        <h2 className="mb-2 font-semibold">Traps to avoid</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">{l.traps.map((t) => <li key={t}>{t}</li>)}</ul>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <StartButton body={{ kind: "practice", skill: id, count: 6 }}>Practice this now (6 questions)</StartButton>
        <CompleteLesson id={id} />
      </div>
      <p className="mt-3 text-sm text-muted">Practicing right after a lesson, then again a few days later in review, is what makes it stick.</p>
    </div>
  );
}
