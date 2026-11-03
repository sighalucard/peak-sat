"use client";
import { useState } from "react";
import type { SessionView } from "@/lib/session-view";
import { Choices, FeedbackPanel, Passage } from "@/components/question-view";
import { MistakePicker } from "@/components/mistake-picker";
import { TutorChat } from "@/components/tutor-chat";
import { Badge, cx } from "@/components/ui";
import { skillName } from "@/content/taxonomy";
import { DIFFICULTY_LABEL } from "@/content/types";

type Item = NonNullable<SessionView["questions"][number]> & { slow: boolean };

export function ReviewList({ sessionId, items, tutorAvailable }: { sessionId: string; items: Item[]; tutorAvailable: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "wrong" | "skipped">("all");
  const [tutor, setTutor] = useState<string | null>(null);
  const shown = items.filter((x) => filter === "all" || (filter === "wrong" ? x.feedback && !x.feedback.correct && x.feedback.response : !x.answer?.response));
  return (
    <div>
      <div className="mb-3 flex gap-1">
        {(["all", "wrong", "skipped"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cx("rounded-full px-3 py-1 text-sm", filter === f ? "bg-ink text-white" : "bg-surface text-muted hover:text-ink")}>{f === "all" ? "All" : f === "wrong" ? "Incorrect" : "Skipped"}</button>
        ))}
      </div>
      <div className="space-y-2">
        {shown.map((x) => {
          const i = items.indexOf(x);
          const fb = x.feedback;
          const status = !x.answer?.response ? "skipped" : fb?.correct ? "correct" : "incorrect";
          const isOpen = open === x.q.id;
          return (
            <div key={x.q.id} className="rounded-2xl border border-line bg-surface">
              <button onClick={() => setOpen(isOpen ? null : x.q.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={isOpen}>
                <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold", status === "correct" ? "bg-good-soft text-good" : status === "incorrect" ? "bg-bad-soft text-bad" : "bg-slate-100 text-muted")}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{x.q.stem.split("\n")[0]}</span>
                <span className="hidden gap-1 sm:flex"><Badge>{skillName(x.q.skill)}</Badge><Badge>{DIFFICULTY_LABEL[x.q.difficulty]}</Badge></span>
                {x.slow && <span title="Took longer than expected">⏱</span>}
                {x.answer?.guessed && <Badge tone="warn">guessed</Badge>}
                <span className="text-muted">{isOpen ? "▴" : "▾"}</span>
              </button>
              {isOpen && fb && (
                <div className="border-t border-line px-4 py-4">
                  <div className={cx("grid gap-6", (x.q.passage || x.q.table) && x.q.section === "RW" ? "lg:grid-cols-2" : "")}>
                    {(x.q.passage || x.q.table) && <Passage q={x.q} />}
                    <div className="space-y-3">
                      <p className="prose-line font-medium">{x.q.stem}</p>
                      <Choices q={x.q} value={x.answer?.response ?? ""} onChange={() => {}} eliminated={[]} feedback={fb} disabled />
                    </div>
                  </div>
                  <div className="mt-5">
                    <FeedbackPanel fb={fb}>
                      {!fb.correct && x.attempt?.id && <MistakePicker attemptId={x.attempt.id} suggested={x.attempt.mistakeCategory} confirmed={x.attempt.mistakeConfirmed} />}
                      {tutorAvailable && (tutor === x.q.id ? (
                        <div className="rounded-xl border border-line p-3"><TutorChat sessionId={sessionId} questionId={x.q.id} answered compact /></div>
                      ) : (
                        <button onClick={() => setTutor(x.q.id)} className="text-sm font-semibold text-brand">Ask the AI tutor about this question →</button>
                      ))}
                    </FeedbackPanel>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
