"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe, Plus, Star } from "lucide-react";
import { AddLanguageDialog } from "./add-language-dialog";

interface LanguageEntry {
  code: string;
  name: string;
  translated: number;
  total: number;
  isPrimary?: boolean;
}

interface LanguageSwitcherProps {
  manualId: string;
  currentLanguage: string;
  primaryLanguage: string;
  languages: LanguageEntry[];
  onLanguageChange: (code: string) => void;
  onAddLanguage: (code: string) => void;
  canEdit: boolean;
}

export function LanguageSwitcher({
  manualId,
  currentLanguage,
  primaryLanguage,
  languages,
  onLanguageChange,
  onAddLanguage,
  canEdit,
}: LanguageSwitcherProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === currentLanguage);
  const currentLabel = currentLang
    ? `${currentLang.name} (${currentLang.code.toUpperCase()})`
    : currentLanguage.toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="language-switcher"
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Globe className="h-4 w-4" />
            {currentLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {lang.code === primaryLanguage && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
                <span>
                  {lang.name} ({lang.code.toUpperCase()})
                </span>
              </div>
              {lang.code !== primaryLanguage && (
                <span
                  data-testid={`completeness-badge-${lang.code}`}
                  className="text-xs text-muted-foreground"
                >
                  {lang.translated}/{lang.total}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setAddDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add language
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddLanguageDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        manualId={manualId}
        existingLanguages={languages.map((l) => l.code)}
        onAdd={(code) => {
          setAddDialogOpen(false);
          onAddLanguage(code);
        }}
      />
    </>
  );
}
