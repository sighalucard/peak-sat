"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.details?.[0] ?? data.error ?? "Something went wrong.");
        return;
      }
      const next = params.get("next");
      router.push(mode === "signup" ? "/onboarding" : next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <label className="block">
          <span className="text-sm font-medium">First name (optional)</span>
          <input name="name" autoComplete="given-name" className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-brand" />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-brand" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-brand" />
        {mode === "signup" && <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>}
      </label>
      {error && <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</Button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? <>Already have an account? <Link className="font-semibold text-brand" href="/login">Log in</Link></> : <>New here? <Link className="font-semibold text-brand" href="/signup">Create an account</Link></>}
      </p>
    </form>
  );
}
