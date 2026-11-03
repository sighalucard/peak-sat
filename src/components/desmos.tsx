"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalc;
    };
  }
}
export interface DesmosCalc {
  destroy(): void;
  setExpression(e: { id?: string; latex: string; color?: string }): void;
  setBlank(): void;
  getExpressions(): { id: string; latex?: string }[];
  HelperExpression(e: { latex: string }): { numericValue: number; observe: (k: string, cb: () => void) => void };
}

// Desmos's documented demo key works for development. For production, request a key
// from Desmos and set NEXT_PUBLIC_DESMOS_API_KEY (it's a public, client-side key).
const KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
let loading: Promise<void> | null = null;

export function loadDesmos() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.Desmos) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.desmos.com/api/v1.9/calculator.js?apiKey=${KEY}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Desmos failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function Desmos({ className, onReady, expressions }: { className?: string; onReady?: (c: DesmosCalc) => void; expressions?: string[] }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let calc: DesmosCalc | null = null;
    let cancelled = false;
    loadDesmos()
      .then(() => {
        if (cancelled || !el.current || !window.Desmos) return;
        calc = window.Desmos.GraphingCalculator(el.current, { expressionsCollapsed: false, settingsMenu: false, zoomButtons: true, border: false });
        expressions?.forEach((latex, i) => calc!.setExpression({ id: `e${i}`, latex }));
        onReady?.(calc);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      calc?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (failed) {
    return (
      <div className={className}>
        <div className="grid h-full place-items-center rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
          The Desmos calculator couldn't load (check your connection or content blockers). You can still use the basic calculator below.
          <BasicCalculator />
        </div>
      </div>
    );
  }
  return <div ref={el} className={className} />;
}

/** Fallback arithmetic calculator used only if Desmos can't load. */
function BasicCalculator() {
  const [expr, setExpr] = useState("");
  let result = "";
  try {
    if (/^[\d+\-*/().\s^]+$/.test(expr) && expr.trim()) {
      // Safe: input is restricted to digits and arithmetic operators.
      result = String(Function(`"use strict"; return (${expr.replace(/\^/g, "**")})`)());
    }
  } catch {
    result = "…";
  }
  return (
    <div className="mt-3 w-full max-w-xs text-left">
      <input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="e.g. (3+4)*2^3" className="w-full rounded-lg border border-line px-3 py-2 font-mono text-ink" aria-label="Calculator input" />
      <div className="mt-1 font-mono text-ink">= {result}</div>
    </div>
  );
}
