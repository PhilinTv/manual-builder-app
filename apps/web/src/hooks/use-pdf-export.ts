"use client";

import { useState, useCallback } from "react";

interface UsePdfExportReturn {
  exporting: boolean;
  error: string | null;
  exportPdf: (manualId: string, language?: string) => Promise<void>;
}

export function usePdfExport(): UsePdfExportReturn {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPdf = useCallback(
    async (manualId: string, language?: string) => {
      setExporting(true);
      setError(null);

      try {
        const params = language ? `?language=${encodeURIComponent(language)}` : "";
        const res = await fetch(`/api/manuals/${manualId}/export/pdf${params}`);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to export PDF");
        }

        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        const filenameMatch = disposition?.match(/filename="(.+)"/);
        const filename = filenameMatch?.[1] || "manual.pdf";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setExporting(false);
      }
    },
    []
  );

  return { exporting, error, exportPdf };
}
