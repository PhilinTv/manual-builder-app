"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { LANGUAGES } from "@/lib/constants/languages";

interface AddLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualId: string;
  existingLanguages: string[];
  onAdd: (code: string) => void;
}

export function AddLanguageDialog({
  open,
  onOpenChange,
  manualId,
  existingLanguages,
  onAdd,
}: AddLanguageDialogProps) {
  const availableLanguages = LANGUAGES.filter(
    (l) => !existingLanguages.includes(l.code)
  );

  async function handleSelect(code: string) {
    const res = await fetch(`/api/manuals/${manualId}/languages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languageCode: code }),
    });

    if (res.ok) {
      onAdd(code);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="add-language-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Language</DialogTitle>
          <DialogDescription>
            Select a language to add to this manual
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search languages..." />
          <CommandList>
            <CommandEmpty>No languages found.</CommandEmpty>
            <CommandGroup>
              {availableLanguages.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={`${lang.name} ${lang.code}`}
                  onSelect={() => handleSelect(lang.code)}
                  role="option"
                >
                  {lang.name} ({lang.code.toUpperCase()})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
