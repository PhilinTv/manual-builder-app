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

interface IncompleteLanguage {
  name: string;
  code: string;
  translated: number;
  total: number;
}

interface PublishWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteLanguages: IncompleteLanguage[];
  onPublishAnyway: () => void;
}

export function PublishWarningDialog({
  open,
  onOpenChange,
  incompleteLanguages,
  onPublishAnyway,
}: PublishWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="publish-warning-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Incomplete Translations</AlertDialogTitle>
          <AlertDialogDescription>
            The following languages have incomplete translations:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-1 text-sm">
          {incompleteLanguages.map((lang) => (
            <li key={lang.code} className="flex items-center justify-between">
              <span>{lang.name}</span>
              <span className="text-muted-foreground">
                {lang.translated}/{lang.total} sections translated
              </span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="publish-anyway-button"
            onClick={onPublishAnyway}
          >
            Publish Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
