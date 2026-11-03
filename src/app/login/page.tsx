import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { AuthPage } from "@/components/auth-page";

export const metadata = { title: "Log in" };

export default async function Login() {
  if (await currentUserId()) redirect("/dashboard");
  return <AuthPage mode="login" />;
}
