import { requireUser } from "@/lib/auth";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Get started" };

export default async function Page() {
  const user = await requireUser();
  return <Onboarding name={user.name} />;
}
