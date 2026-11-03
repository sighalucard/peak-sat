import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import { QUESTIONS } from "@/content/bank";

const FEATURES = [
  { t: "Diagnostic and personal plan", d: "A 24-question diagnostic across all 8 SAT domains, then a daily plan sized to the time you actually have." },
  { t: "AI tutor that knows the question", d: "Ask “why isn’t B right?” without leaving the question. It works from the verified answer key and won’t spoil answers before you submit." },
  { t: "Hints that don’t give it away", d: "Three levels, from a nudge to the next step. Offered only when you’ve been stuck and idle, never forced." },
  { t: "Mistakes that come back", d: "Missed and guessed questions return on a spaced schedule, often as a new question on the same skill." },
  { t: "Realistic full-length tests", d: "Official module timing, adaptive routing, the 10-minute break, Desmos, and a test mode with no hints." },
  { t: "Honest score estimates", d: "Ranges that tighten with data, clearly labeled unofficial. No made-up precision." },
];

export default async function Home() {
  if (await currentUserId()) redirect("/dashboard");
  const n = QUESTIONS.length;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-lg font-bold">Peak SAT</span>
        <nav className="flex items-center gap-2"><Link href="/methods" className="hidden px-3 text-sm text-muted hover:text-ink sm:block">Our methods</Link><LinkButton href="/login" variant="ghost">Log in</LinkButton><LinkButton href="/signup">Get started</LinkButton></nav>
      </header>
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-12 text-center sm:pt-20">
        <p className="mb-3 text-sm font-semibold text-brand">Digital SAT prep that adapts to you</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Raise your score by studying what actually moves it.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">Personalized practice, a built-in AI tutor, spaced review of your mistakes, and full-length tests in the real digital SAT format, built on study methods with real evidence behind them.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><LinkButton href="/signup" className="px-6 py-3 text-base">Create a free account</LinkButton><LinkButton href="/methods" variant="secondary" className="px-6 py-3 text-base">See the research</LinkButton></div>
        <p className="mt-4 text-xs text-muted">{n} verified practice questions · every math answer checked by code</p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.t} className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-semibold">{f.t}</h2>
            <p className="mt-2 text-sm text-muted">{f.d}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-line py-8 text-center text-xs text-muted">
        SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this product. Practice questions are original. Score estimates are unofficial.
      </footer>
    </div>
  );
}
