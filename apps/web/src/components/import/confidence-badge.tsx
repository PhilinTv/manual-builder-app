"use client";

import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

function getLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const level = getLevel(confidence);
  const percent = Math.round(confidence * 100);

  return (
    <span
      data-testid="confidence-badge"
      data-level={level}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        level === "high" && "bg-green-100 text-green-800",
        level === "medium" && "bg-yellow-100 text-yellow-800",
        level === "low" && "bg-red-100 text-red-800",
        className
      )}
    >
      {percent}%
    </span>
  );
}
