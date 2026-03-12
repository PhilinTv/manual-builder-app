import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { ManualEditor } from "@/components/manuals/manual-editor";

interface ManualDetailPageProps {
  params: { id: string };
}

export default async function ManualDetailPage({ params }: ManualDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let manual;
  try {
    manual = await getManualById(params.id);
  } catch {
    notFound();
  }

  const assignedUserIds = manual.assignments.map((a) => a.user.id);
  const canEdit = canUserEdit({
    role: session.user.role,
    assignedUserIds,
    userId: session.user.id,
  });

  const manualData = {
    id: manual.id,
    productName: manual.productName,
    overview: manual.overview as any,
    instructions: manual.instructions as any,
    warnings: manual.warnings as any,
    status: manual.status,
    createdBy: manual.createdBy,
    assignees: manual.assignments.map((a) => a.user),
  };

  return <ManualEditor manual={manualData} canEdit={canEdit} userRole={session.user.role} />;
}
