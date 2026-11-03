import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessionView } from "@/lib/session-view";
import { PracticeRunner } from "./practice-runner";
import { ExamRunner } from "./exam-runner";
import { Results } from "./results";

export const metadata = { title: "Session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const s = await db.practiceSession.findFirst({ where: { id, userId: user.id } });
  if (!s) notFound();
  const view = await sessionView(s, user.id);
  if (view.status === "completed") return <Results view={view} />;
  if (view.exam) return <ExamRunner initial={view} />;
  return (
    <PracticeRunner
      initial={view}
      hintFactor={user.profile?.hintDelayFactor ?? 1}
      autoNudges={user.profile?.autoHintNudges ?? true}
      tutorAvailable={!!process.env.ANTHROPIC_API_KEY}
    />
  );
}
