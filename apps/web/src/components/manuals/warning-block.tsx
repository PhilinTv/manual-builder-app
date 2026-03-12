"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface WarningBlockProps {
  index: number;
  title: string;
  description: string;
  severity: string;
  onChange: (data: { title?: string; description?: string; severity?: string }) => void;
  onRemove: () => void;
  editable: boolean;
}

const severityColors: Record<string, string> = {
  DANGER: "bg-red-500",
  WARNING: "bg-orange-500",
  CAUTION: "bg-yellow-500",
};

export function WarningBlock({
  index,
  title,
  description,
  severity,
  onChange,
  onRemove,
  editable,
}: WarningBlockProps) {
  return (
    <div data-testid="warning-block" className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            data-testid="severity-indicator"
            className={cn("h-3 w-3 rounded-full", severityColors[severity] || "bg-gray-400")}
          />
          <span className="text-sm font-semibold text-muted-foreground">
            Warning {index + 1}
          </span>
        </div>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Input
        data-testid="warning-title"
        placeholder="Warning title"
        value={title}
        onChange={(e) => onChange({ title: e.target.value })}
        disabled={!editable}
      />
      <textarea
        data-testid="warning-description"
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Warning description"
        value={description}
        onChange={(e) => onChange({ description: e.target.value })}
        disabled={!editable}
      />
      <Select
        value={severity}
        onValueChange={(value) => onChange({ severity: value })}
        disabled={!editable}
      >
        <SelectTrigger className="w-40" aria-label="Severity">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DANGER">Danger</SelectItem>
          <SelectItem value="WARNING">Warning</SelectItem>
          <SelectItem value="CAUTION">Caution</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
