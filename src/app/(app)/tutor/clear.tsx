"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function ClearChat() {
  const router = useRouter();
  return <Button variant="secondary" onClick={async () => { await fetch("/api/tutor/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadKey: "general" }) }); router.refresh(); }}>New conversation</Button>;
}
