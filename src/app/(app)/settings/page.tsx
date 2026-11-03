import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const user = await requireUser();
  const p = user.profile;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle={user.email} />
      <SettingsForm initial={{
        name: user.name ?? "",
        currentScore: p?.currentScore ?? null, targetScore: p?.targetScore ?? null,
        testDate: p?.testDate ? p.testDate.toISOString().slice(0, 10) : "",
        dailyMinutes: p?.dailyMinutes ?? 30, weeklyGoalMin: p?.weeklyGoalMin ?? null,
        hintDelayFactor: p?.hintDelayFactor ?? 1, autoHintNudges: p?.autoHintNudges ?? true,
      }} />
    </div>
  );
}
