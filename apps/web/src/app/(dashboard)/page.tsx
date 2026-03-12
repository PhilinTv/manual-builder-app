import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {session.user.name}</h1>
      <p className="mt-2 text-muted-foreground">
        This is your dashboard. Use the sidebar to navigate.
      </p>
    </div>
  );
}
