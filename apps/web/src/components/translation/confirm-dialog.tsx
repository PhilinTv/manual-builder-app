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

interface TranslateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
  sectionCount: number;
  onConfirm: () => void;
}

export function TranslateConfirmDialog({
  open,
  onOpenChange,
  estimatedInputTokens,
  estimatedOutputTokens,
  estimatedCost,
  sectionCount,
  onConfirm,
}: TranslateConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="translate-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Auto-Translation</AlertDialogTitle>
          <AlertDialogDescription>
            This will auto-translate {sectionCount} section
            {sectionCount !== 1 ? "s" : ""} using AI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Estimated tokens:</span>
            <span data-testid="token-estimate">
              {estimatedInputTokens + estimatedOutputTokens}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Estimated cost:</span>
            <span data-testid="cost-estimate">
              ${estimatedCost.toFixed(2)}
            </span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="translate-cancel-button">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="translate-confirm-button"
            onClick={onConfirm}
          >
            Translate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
