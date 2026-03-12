"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface StaleIndicatorProps {
  onRetranslate: () => void;
}

export function StaleIndicator({ onRetranslate }: StaleIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        data-testid="stale-indicator"
        className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
      >
        <AlertTriangle className="h-3 w-3" />
        Source changed
      </span>
      <Button
        data-testid="retranslate-button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs"
        onClick={onRetranslate}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        Re-translate
      </Button>
    </div>
  );
}
