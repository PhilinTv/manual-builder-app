"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Diamond } from "lucide-react";

type Severity = "DANGER" | "WARNING" | "CAUTION";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const severityConfig: Record<
  Severity,
  { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  DANGER: {
    label: "Danger",
    color: "bg-red-100 text-red-800 border-red-200",
    Icon: AlertTriangle,
  },
  WARNING: {
    label: "Warning",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    Icon: AlertCircle,
  },
  CAUTION: {
    label: "Caution",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Icon: Diamond,
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  if (!config) return null;

  const { label, color, Icon } = config;

  return (
    <span
      data-testid="severity-badge"
      data-severity={severity}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
