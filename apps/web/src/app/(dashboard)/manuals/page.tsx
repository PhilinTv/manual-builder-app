import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ManualList } from "@/components/manuals/manual-list";

export default async function ManualsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Manuals</h1>
      <p className="mt-2 text-muted-foreground">
        Browse and manage user manuals.
      </p>
      <div className="mt-6">
        <ManualList userRole={session.user.role} />
      </div>
    </div>
  );
}
