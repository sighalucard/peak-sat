import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const path = (await headers()).get("x-pathname") ?? "";
  if (!user.profile?.onboarded && !path.startsWith("/onboarding")) redirect("/onboarding");
  return <AppShell name={user.name || user.email}>{children}</AppShell>;
}
