"use client";
import { useEffect, useRef, useState } from "react";

/** Counts milliseconds while the tab is visible. Resets when `key` changes. */
export function useActiveTimer(key: string, startMs = 0, running = true) {
  const [ms, setMs] = useState(startMs);
  const base = useRef(startMs);
  const since = useRef<number | null>(null);
  useEffect(() => {
    base.current = startMs;
    setMs(startMs);
    since.current = running && !document.hidden ? Date.now() : null;
    const tick = () => setMs(base.current + (since.current ? Date.now() - since.current : 0));
    const vis = () => {
      if (document.hidden) {
        if (since.current) base.current += Date.now() - since.current;
        since.current = null;
      } else if (running) since.current = Date.now();
      tick();
    };
    const t = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, running]);
  const read = () => base.current + (since.current ? Date.now() - since.current : 0);
  return { ms, read };
}
