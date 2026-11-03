"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

export function CompleteLesson({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button variant="secondary" disabled={done} onClick={async () => { const r = await fetch(`/api/lessons/${id}`, { method: "POST" }); if (r.ok) setDone(true); }}>
      {done ? "✓ Marked as read" : "Mark as read"}
    </Button>
  );
}
