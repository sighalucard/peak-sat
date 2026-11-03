"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/practice", label: "Practice", icon: "M4 19h16M4 15l4-4 4 4 8-8" },
  { href: "/tutor", label: "AI Tutor", icon: "M8 10h8M8 14h5M4 5h16v11H9l-5 4V5z" },
  { href: "/plan", label: "Study Plan", icon: "M7 3v3M17 3v3M4 8h16M5 5h14v15H5zM9 13l2 2 4-4" },
  { href: "/mistakes", label: "Mistake Review", icon: "M12 9v4M12 17h.01M10.3 3.9L2.5 17.5A2 2 0 004.2 20.5h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" },
  { href: "/tests", label: "Full SAT Tests", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 13h6M9 17h4" },
  { href: "/lessons", label: "Lessons", icon: "M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5M12 6.5c1.5-1.5 4-2 8-1.5v13c-4-.5-6.5 0-8 1.5M12 6.5v13" },
  { href: "/progress", label: "Progress", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" },
];
const MORE = [
  { href: "/calculator", label: "Desmos Training" },
  { href: "/methods", label: "Our Study Methods" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Links({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={active(n.href) ? "page" : undefined}
          className={cx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active(n.href) ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-100 hover:text-ink")}>
          <Icon d={n.icon} />
          {n.label}
        </Link>
      ))}
      <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">More</div>
      {MORE.map((n) => (
        <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={active(n.href) ? "page" : undefined}
          className={cx("rounded-xl px-3 py-2 text-sm font-medium", active(n.href) ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-100 hover:text-ink")}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden><path d="M3 19l6-9 4 5 3-4 5 8z" strokeLinejoin="round" /></svg>
      </span>
      Peak SAT
    </Link>
  );
}

export function AppShell({ name, children }: { name: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex lg:sticky lg:top-0 lg:h-dvh">
        <div className="px-2"><Logo /></div>
        <div className="mt-6 flex-1 overflow-y-auto"><Links /></div>
        <div className="border-t border-line pt-3">
          <div className="truncate px-3 text-sm font-medium">{name}</div>
          <button onClick={logout} className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-slate-100 hover:text-ink">Log out</button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Open menu">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 overflow-y-auto bg-surface p-4 shadow-xl fade-in">
            <div className="mb-4 flex items-center justify-between">
              <span className="truncate text-sm font-medium">{name}</span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close menu">✕</button>
            </div>
            <Links onNavigate={() => setOpen(false)} />
            <button onClick={logout} className="mt-4 w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-slate-100">Log out</button>
          </div>
        </div>
      )}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
