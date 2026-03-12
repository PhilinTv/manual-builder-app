"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Language {
  code: string;
  name: string;
  translated: number;
  total: number;
}

interface LanguageSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  languages: Language[];
  onSelect: (languageCode: string) => void;
}

export function LanguageSelectDialog({
  open,
  onOpenChange,
  languages,
  onSelect,
}: LanguageSelectDialogProps) {
  const [selected, setSelected] = useState(languages[0]?.code || "en");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="language-select-dialog">
        <DialogHeader>
          <DialogTitle>Select Language for Export</DialogTitle>
          <DialogDescription>
            Choose which language version to export as PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {languages.map((lang) => (
            <label
              key={lang.code}
              className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                selected === lang.code
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="export-language"
                  value={lang.code}
                  checked={selected === lang.code}
                  onChange={() => setSelected(lang.code)}
                  className="accent-primary"
                />
                <span className="font-medium">{lang.name}</span>
              </div>
              {lang.total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {lang.translated}/{lang.total} translated
                </span>
              )}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSelect(selected)}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
