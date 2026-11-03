"use client";
import { useEffect, useRef, useState } from "react";
import { Button, cx } from "./ui";

export interface ChatMsg { role: "user" | "assistant"; content: string }

export function TutorChat({
  sessionId, questionId, answered, initial = [], compact, prompts,
}: {
  sessionId?: string; questionId?: string; answered: boolean; initial?: ChatMsg[]; compact?: boolean; prompts?: string[];
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => setMsgs(initial), [questionId, answered]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [msgs]);

  const defaultPrompts = answered
    ? ["Explain this more simply", "Why is my answer wrong?", "Show me a faster way", "Teach me the concept behind this"]
    : ["What concept is this testing?", "Where should I start?", "Can you explain what the question is asking?"];

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, sessionId, questionId }) });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setMsgs((m) => m.slice(0, -1));
        setError(d.error ?? "The tutor couldn't respond. Please try again.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: m[m.length - 1].content + chunk }]);
      }
    } catch {
      setMsgs((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
      setError("Connection lost. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cx("flex flex-col", compact ? "h-[28rem]" : "h-[calc(100dvh-14rem)] min-h-[24rem]")}>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {msgs.length === 0 && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-muted">
            {questionId
              ? answered ? "Ask anything about this question. I know the verified answer and explanation." : "I can help you think it through, but I won't give away the answer before you submit."
              : "Ask about any SAT concept, strategy, or a question you're stuck on."}
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cx("max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "ml-auto bg-brand text-white" : "bg-slate-100 text-ink")}>
            {m.content || <span className="inline-flex gap-1 text-muted" aria-label="Tutor is typing">●<span className="animate-pulse">●</span>●</span>}
          </div>
        ))}
        <div ref={end} />
      </div>
      {error && <p role="alert" className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(prompts ?? defaultPrompts).map((p) => (
          <button key={p} disabled={busy} onClick={() => send(p)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand disabled:opacity-50">{p}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-2 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder="Ask the tutor…" aria-label="Message the tutor" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
        <Button type="submit" disabled={busy || !input.trim()}>Send</Button>
      </form>
    </div>
  );
}
