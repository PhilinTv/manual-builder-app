"use client";

import { useRouter } from "next/navigation";
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

interface DeleteManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualId: string;
}

export function DeleteManualDialog({
  open,
  onOpenChange,
  manualId,
}: DeleteManualDialogProps) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch(`/api/manuals/${manualId}`, {
      method: "DELETE",
    });

    if (res.ok || res.status === 204) {
      toast.success("Manual deleted successfully");
      onOpenChange(false);
      router.push("/manuals");
    } else {
      toast.error("Failed to delete manual");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Manual</AlertDialogTitle>
          <AlertDialogDescription>
            This manual will be deleted. It can be recovered within 30 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
