"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FavoriteToggleProps {
  manualId: string;
  initialFavorited: boolean;
  className?: string;
  onToggle?: (favorited: boolean) => void;
}

export function FavoriteToggle({
  manualId,
  initialFavorited,
  className,
  onToggle,
}: FavoriteToggleProps) {
  const [favorited, setFavorited] = useState(initialFavorited);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const previous = favorited;
    const next = !favorited;

    // Optimistic update
    setFavorited(next);
    onToggle?.(next);

    try {
      const res = await fetch(`/api/manuals/${manualId}/favorite`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to toggle favorite");
      }
    } catch {
      // Rollback on error
      setFavorited(previous);
      onToggle?.(previous);
      toast.error("Failed to update favorite");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0", className)}
      data-favorited={favorited ? "true" : "false"}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      onClick={handleClick}
    >
      <Star
        className={cn(
          "h-4 w-4",
          favorited
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
