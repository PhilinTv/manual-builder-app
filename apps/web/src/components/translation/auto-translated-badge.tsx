"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface AutoTranslatedBadgeProps {
  onApprove: () => void;
}

export function AutoTranslatedBadge({ onApprove }: AutoTranslatedBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        data-testid="auto-translated-badge"
        className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
      >
        Auto-translated
      </span>
      <Button
        data-testid="approve-translation-button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs"
        onClick={onApprove}
      >
        <Check className="mr-1 h-3 w-3" />
        Approve
      </Button>
    </div>
  );
}
