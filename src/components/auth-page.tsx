import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">Peak SAT</Link>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="mb-5 text-sm text-muted">{mode === "signup" ? "Your progress, plan, and results are saved to your account." : "Log in to pick up where you left off."}</p>
          <Suspense><AuthForm mode={mode} /></Suspense>
        </div>
      </div>
    </div>
  );
}
