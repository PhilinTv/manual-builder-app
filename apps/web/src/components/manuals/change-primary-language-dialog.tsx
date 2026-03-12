"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/constants/languages";

interface ChangePrimaryLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualId: string;
  currentPrimaryLanguage: string;
  onChanged: (code: string) => void;
}

export function ChangePrimaryLanguageDialog({
  open,
  onOpenChange,
  manualId,
  currentPrimaryLanguage,
  onChanged,
}: ChangePrimaryLanguageDialogProps) {
  const [selected, setSelected] = useState(currentPrimaryLanguage);

  async function handleConfirm() {
    if (selected === currentPrimaryLanguage) {
      onOpenChange(false);
      return;
    }

    const res = await fetch(`/api/manuals/${manualId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryLanguage: selected }),
    });

    if (res.ok) {
      onChanged(selected);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Primary Language</DialogTitle>
          <DialogDescription>
            Changing the primary language affects how translations are displayed.
          </DialogDescription>
        </DialogHeader>
        <select
          data-testid="primary-language-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.code.toUpperCase()})
            </option>
          ))}
        </select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
