"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface RollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualId: string;
  versionNumber: number;
  onConfirm: () => void;
}

export function RollbackDialog({
  open,
  onOpenChange,
  manualId,
  versionNumber,
  onConfirm,
}: RollbackDialogProps) {
  async function handleRollback() {
    const res = await fetch(
      `/api/manuals/${manualId}/versions/${versionNumber}/rollback`,
      { method: "POST" }
    );

    if (res.ok) {
      toast.success(`Rolled back to version ${versionNumber}`);
      onConfirm();
    } else {
      toast.error("Failed to rollback");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="rollback-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Rollback to Version {versionNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will replace the current manual content with the content from
            Version {versionNumber}. A new version will be created with the
            current content before rolling back. This action is reversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRollback}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Rollback
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
