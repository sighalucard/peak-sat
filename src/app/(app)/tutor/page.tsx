import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { TutorChat, type ChatMsg } from "@/components/tutor-chat";
import { tutorConfigured } from "@/lib/tutor";
import { ClearChat } from "./clear";

export const metadata = { title: "AI Tutor" };

export default async function Tutor() {
  const user = await requireUser();
  const history = await db.chatMessage.findMany({ where: { userId: user.id, threadKey: "general" }, orderBy: { createdAt: "asc" }, take: 40 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="AI Tutor" subtitle="Ask about any SAT concept or strategy. For help with a specific question, open the tutor from the practice screen. It sees the question and its verified answer key." actions={history.length ? <ClearChat /> : undefined} />
      <Card>
        {tutorConfigured() ? (
          <TutorChat answered={false} initial={history.map((m) => ({ role: m.role, content: m.content }) as ChatMsg)}
            prompts={["How should I pace myself on the Math section?", "Explain when to use a semicolon vs. a colon", "How do I find the vertex of a parabola?", "What's the difference between random sampling and random assignment?"]} />
        ) : (
          <div className="py-6 text-center text-sm text-muted">
            <p className="font-semibold text-ink">The AI tutor isn't set up yet.</p>
            <p className="mt-1">The server doesn't have an AI API key configured, so the tutor is turned off instead of giving fake answers. Everything else (hints, worked explanations, <Link className="text-brand" href="/lessons">lessons</Link>) works without it.</p>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">The tutor can make mistakes, especially on questions outside our verified bank. It's instructed to say when it isn't sure. On practice questions it uses the verified answer key as the source of truth.</p>
    </div>
  );
}
