"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, ChevronDown } from "lucide-react";

interface TranslateButtonProps {
  onTranslateSection: () => void;
  onTranslateAll: () => void;
  disabled?: boolean;
}

export function TranslateButton({
  onTranslateSection,
  onTranslateAll,
  disabled,
}: TranslateButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="translate-button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1"
        >
          <Languages className="h-4 w-4" />
          Auto-translate
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          data-testid="translate-section-option"
          onClick={onTranslateSection}
        >
          Translate this section
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="translate-all-option"
          onClick={onTranslateAll}
        >
          Translate all sections
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
