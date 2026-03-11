"use client";

import { SeverityBadge } from "@/components/ui/severity-badge";
import { Button } from "@/components/ui/button";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "DANGER" | "WARNING" | "CAUTION";

interface LibraryWarningCardProps {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  onRemove: () => void;
  editable: boolean;
}

const cardColors: Record<Severity, string> = {
  DANGER: "border-red-200 bg-red-50",
  WARNING: "border-orange-200 bg-orange-50",
  CAUTION: "border-yellow-200 bg-yellow-50",
};

export function LibraryWarningCard({
  title,
  description,
  severity,
  onRemove,
  editable,
}: LibraryWarningCardProps) {
  return (
    <div
      data-testid="library-warning-card"
      data-severity={severity}
      className={cn("rounded-lg border p-4 space-y-2", cardColors[severity])}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {editable && (
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
          )}
          <SeverityBadge severity={severity} />
          <span className="text-xs font-medium text-muted-foreground">(Library)</span>
        </div>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="remove-warning"
            onClick={onRemove}
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
