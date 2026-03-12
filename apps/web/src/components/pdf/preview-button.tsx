"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { PreviewOverlay } from "@/components/pdf/preview-overlay";

interface PreviewButtonProps {
  manualId: string;
  currentLanguage: string;
}

export function PreviewButton({ manualId, currentLanguage }: PreviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        data-testid="preview-pdf-button"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Eye className="mr-1 h-4 w-4" />
        Preview
      </Button>

      {open && (
        <PreviewOverlay
          manualId={manualId}
          currentLanguage={currentLanguage}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
