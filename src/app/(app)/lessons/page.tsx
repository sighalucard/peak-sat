import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LESSONS } from "@/content/lessons";
import { DOMAINS, skillById } from "@/content/taxonomy";
import { Badge, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Lessons" };

export default async function Lessons() {
  const user = await requireUser();
  const done = new Set((await db.lessonView.findMany({ where: { userId: user.id } })).map((l) => l.lessonId));
  return (
    <div>
      <PageHeader title="Concept lessons" subtitle="Short, one-concept lessons with a worked example and the traps to avoid. Each one ends with targeted practice." />
      <div className="space-y-6">
        {DOMAINS.map((d) => (
          <div key={d.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{d.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LESSONS.filter((l) => skillById.get(l.id)?.domain === d.id).map((l) => (
                <Link key={l.id} href={`/lessons/${l.id}`}>
                  <Card className="h-full transition-colors hover:border-brand/40">
                    <div className="flex items-start justify-between gap-2"><span className="font-semibold">{l.title}</span>{done.has(l.id) && <Badge tone="good">Done</Badge>}</div>
                    <p className="mt-1 text-sm text-muted">{l.idea}</p>
                    <p className="mt-2 text-xs text-muted">{l.minutes} min read</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
