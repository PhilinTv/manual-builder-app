"use client";

interface ConnectionIndicatorProps {
  showIndicator: boolean;
}

export function ConnectionIndicator({ showIndicator }: ConnectionIndicatorProps) {
  if (!showIndicator) return null;

  return (
    <div
      data-testid="connection-lost-indicator"
      className="flex items-center gap-1.5"
      title="Connection lost"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs text-red-600 hidden sm:inline">
        Connection lost
      </span>
    </div>
  );
}
