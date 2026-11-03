"use client";
import { useState } from "react";

export interface Point { label: string; value: number; low?: number; high?: number }

/** Single-series line chart with an uncertainty band and a hover crosshair. */
export function LineChart({ points, min, max, height = 180, format = (v: number) => String(Math.round(v)), ariaLabel }: {
  points: Point[]; min: number; max: number; height?: number; format?: (v: number) => string; ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = height, P = { l: 40, r: 12, t: 12, b: 24 };
  if (points.length === 0) return null;
  const x = (i: number) => P.l + (points.length === 1 ? (W - P.l - P.r) / 2 : (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join("");
  const hasBand = points.every((p) => p.low != null && p.high != null);
  const band = hasBand ? `${points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.high!)}`).join("")}${[...points].reverse().map((p, j) => `L${x(points.length - 1 - j)},${y(p.low!)}`).join("")}Z` : "";
  const ticks = [min, (min + max) / 2, max];
  const h = hover != null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
          setHover(best);
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{format(t)}</text>
          </g>
        ))}
        {hasBand && <path d={band} fill="var(--brand)" opacity={0.12} />}
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 3.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--muted)" strokeDasharray="3 3" />}
        <text x={x(0)} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="start">{points[0].label}</text>
        {points.length > 1 && <text x={x(points.length - 1)} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">{points.at(-1)!.label}</text>}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm" style={{ left: `${(x(hover!) / W) * 100}%`, transform: "translateX(-50%)" }}>
          <div className="font-semibold">{h.label}</div>
          <div>{format(h.value)}{h.low != null && ` (range ${format(h.low)}–${format(h.high!)})`}</div>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for accuracy by category, with hover values and an accessible table fallback. */
export function Bars({ rows }: { rows: { label: string; value: number; n: number; sub?: string }[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${Math.round(r.value * 100)}% over ${r.n} questions`}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{r.label}{r.sub && <span className="text-muted"> · {r.sub}</span>}</span>
            <span className="shrink-0 tabular-nums text-muted">{r.n ? `${Math.round(r.value * 100)}%` : "–"} <span className="text-xs">({r.n})</span></span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand" style={{ width: `${r.n ? Math.max(2, r.value * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
