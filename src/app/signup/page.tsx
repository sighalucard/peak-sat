import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { AuthPage } from "@/components/auth-page";

export const metadata = { title: "Sign up" };

export default async function Signup() {
  if (await currentUserId()) redirect("/dashboard");
  return <AuthPage mode="signup" />;
}
