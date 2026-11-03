import Link from "next/link";
import { METHODS, type Rating } from "@/content/methods";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Our study methods" };

const TONE: Record<Rating, "good" | "brand" | "warn" | "bad"> = { Validated: "good", Promising: "brand", Unverified: "warn", Ineffective: "bad" };

export default function Methods() {
  const order: Rating[] = ["Validated", "Promising", "Unverified", "Ineffective"];
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-muted hover:text-ink">← Home</Link>
      <h1 className="mt-2 text-3xl font-bold">How we chose our study methods</h1>
      <p className="mt-2 text-muted">We sorted popular SAT study methods by the strength of the evidence behind them. Only <b>validated</b> methods are core features. <b>Promising</b> ones are optional or supporting. <b>Unverified</b> and <b>ineffective</b> ones are deliberately left out. Social media popularity alone doesn't count as evidence.</p>
      <div className="mt-4 flex flex-wrap gap-2">{order.map((r) => <Badge key={r} tone={TONE[r]}>{r}: {METHODS.filter((m) => m.rating === r).length}</Badge>)}</div>
      <div className="mt-8 space-y-4">
        {order.flatMap((r) => METHODS.filter((m) => m.rating === r)).map((m) => (
          <Card key={m.name}>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{m.name}</h2><Badge tone={TONE[m.rating]}>{m.rating}</Badge></div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold">What it is</dt><dd className="text-muted">{m.what}</dd></div>
              <div><dt className="font-semibold">Why it's {m.rating === "Validated" || m.rating === "Promising" ? "included" : "not included"}</dt><dd className="text-muted">{m.why}</dd></div>
              <div><dt className="font-semibold">Evidence</dt><dd className="text-muted">{m.evidence}</dd></div>
              <div><dt className="font-semibold">How the site uses it</dt><dd className="text-muted">{m.how}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold">Limitations</dt><dd className="text-muted">{m.limits}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Sources: {m.sources.join("; ")}</p>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted">SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this product. Score estimates on this site are unofficial.</p>
    </div>
  );
}
