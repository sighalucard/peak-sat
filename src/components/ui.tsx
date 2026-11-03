import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)} {...rest}>
      {children}
    </div>
  );
}

const btn = {
  primary: "bg-brand text-white hover:bg-indigo-800 disabled:bg-indigo-300",
  secondary: "bg-surface text-ink border border-line hover:border-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-muted hover:text-ink hover:bg-slate-100",
  danger: "bg-bad text-white hover:bg-rose-800",
};
type BtnVariant = keyof typeof btn;

export function Button({ variant = "primary", className, ...rest }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return (
    <button
      className={cx("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed", btn[variant], className)}
      {...rest}
    />
  );
}

export function LinkButton({ variant = "primary", className, ...rest }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return (
    <Link
      className={cx("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors", btn[variant], className)}
      {...rest}
    />
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "brand" | "good" | "bad" | "warn"; children: ReactNode; className?: string }) {
  const t = {
    neutral: "bg-slate-100 text-slate-700",
    brand: "bg-brand-soft text-brand",
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    warn: "bg-warn-soft text-warn",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", t, className)}>{children}</span>;
}

export function Progress({ value, tone = "brand", className, label }: { value: number; tone?: "brand" | "good" | "bad" | "warn"; className?: string; label?: string }) {
  const c = { brand: "bg-brand", good: "bg-good", bad: "bg-bad", warn: "bg-amber-500" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx("h-full rounded-full transition-all", c)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
