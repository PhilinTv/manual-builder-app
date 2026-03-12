import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@wapp/db";

export { hashPassword, verifyPassword } from "@/lib/password";

export async function getRequiredSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(role: Role) {
  const session = await getRequiredSession();
  if (session.user.role !== role) {
    redirect("/");
  }
  return session;
}
