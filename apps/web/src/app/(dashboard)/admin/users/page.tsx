import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "./user-management";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">User Management</h1>
      <p className="mt-2 text-muted-foreground">
        Manage users, approve registrations, and assign roles.
      </p>
      <div className="mt-6">
        <UserManagement />
      </div>
    </div>
  );
}
