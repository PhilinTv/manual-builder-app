import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WarningLibrary } from "@/components/warnings/warning-library";

export default async function WarningsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Danger Warnings Library</h1>
      <p className="mt-2 text-muted-foreground">
        Manage reusable danger warnings that can be linked to manuals.
      </p>
      <div className="mt-6">
        <WarningLibrary />
      </div>
    </div>
  );
}
