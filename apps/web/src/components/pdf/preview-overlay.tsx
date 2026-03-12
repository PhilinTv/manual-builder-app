"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2 } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePdfExport } from "@/hooks/use-pdf-export";

interface PreviewOverlayProps {
  manualId: string;
  currentLanguage: string;
  onClose: () => void;
}

export function PreviewOverlay({
  manualId,
  currentLanguage,
  onClose,
}: PreviewOverlayProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { exportPdf, exporting } = usePdfExport();

  const closeRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = `/api/manuals/${manualId}/preview/pdf?language=${encodeURIComponent(currentLanguage)}`;

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusable: HTMLElement[] = [];
      if (closeRef.current) focusable.push(closeRef.current);
      if (downloadRef.current) focusable.push(downloadRef.current);
      if (iframeRef.current && isDesktop) focusable.push(iframeRef.current);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isDesktop]);

  // Focus close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Prevent body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleDownload = useCallback(async () => {
    await exportPdf(manualId, currentLanguage);
  }, [exportPdf, manualId, currentLanguage]);

  return (
    <div
      data-testid="preview-overlay"
      className="fixed inset-0 z-50 flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="PDF Preview"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-3">
        <h2 className="text-sm font-medium text-white">PDF Preview</h2>
        <div className="flex items-center gap-2">
          <Button
            ref={downloadRef}
            data-testid="preview-download-button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={exporting}
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            {exporting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Download PDF
          </Button>
          <Button
            ref={closeRef}
            data-testid="preview-close-button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {isDesktop ? (
          <div className="relative h-full w-full">
            {!iframeLoaded && (
              <div
                data-testid="preview-spinner"
                className="absolute inset-0 flex items-center justify-center"
              >
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              data-testid="preview-iframe"
              src={previewUrl}
              className="h-full w-full"
              onLoad={() => setIframeLoaded(true)}
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            {/* Spinner shown briefly on mobile before content renders */}
            <div
              data-testid="preview-spinner"
              className="mb-2"
            >
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <p className="text-sm text-white/70">
              PDF preview is not available on mobile devices.
            </p>
            <Button
              data-testid="preview-download-button-mobile"
              variant="outline"
              onClick={handleDownload}
              disabled={exporting}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              {exporting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
