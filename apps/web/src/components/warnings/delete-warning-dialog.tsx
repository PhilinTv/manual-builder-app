"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warningId: string | null;
  onSuccess: () => void;
}

export function DeleteWarningDialog({
  open,
  onOpenChange,
  warningId,
  onSuccess,
}: DeleteWarningDialogProps) {
  async function handleDelete() {
    if (!warningId) return;

    const res = await fetch(`/api/warnings/${warningId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Warning deleted");
      onOpenChange(false);
      onSuccess();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Warning</AlertDialogTitle>
          <AlertDialogDescription>
            This warning will be permanently removed from all manuals using it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
