"use client";

import { Button } from "@/components/ui/button";

interface StaleBannerProps {
  visible: boolean;
  updatedBy: string;
  onReload: () => void;
}

export function StaleBanner({ visible, updatedBy, onReload }: StaleBannerProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="stale-banner"
      className="mb-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3"
    >
      <p className="text-sm text-amber-800">
        This manual has been updated by {updatedBy}. You may be viewing stale
        content.
      </p>
      <Button
        data-testid="stale-banner-reload"
        size="sm"
        onClick={onReload}
      >
        Reload
      </Button>
    </div>
  );
}
