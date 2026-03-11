import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { NotificationProvider } from "@/components/notifications/notification-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.status === "PENDING") {
    redirect("/pending");
  }

  if (session.user.status === "DEACTIVATED") {
    redirect("/login");
  }

  return (
    <NotificationProvider>
      <AppShell userName={session.user.name} userRole={session.user.role}>
        {children}
      </AppShell>
    </NotificationProvider>
  );
}
