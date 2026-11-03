"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

/** Creates a session on the server and opens it. */
export function StartButton({ body, children, variant }: { body: Record<string, unknown>; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      router.push(`/session/${d.id}`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't start. Please try again.");
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <Button variant={variant} onClick={start} disabled={busy}>{busy ? "Starting…" : children}</Button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </span>
  );
}
