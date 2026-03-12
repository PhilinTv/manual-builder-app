"use client";

import { useState } from "react";

interface PdfViewerProps {
  importId: string;
  filename: string;
}

export function PdfViewer({ importId, filename }: PdfViewerProps) {
  const [loadError, setLoadError] = useState(false);
  const pdfUrl = `/api/imports/${importId}/file`;

  if (loadError) {
    return (
      <div
        data-testid="pdf-viewer"
        className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-lg border bg-muted/30"
      >
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium">{filename}</p>
          <p className="text-xs text-muted-foreground">
            PDF preview unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="pdf-viewer" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <span className="font-medium">{filename}</span>
      </div>
      <iframe
        src={pdfUrl}
        title={`PDF preview: ${filename}`}
        className="h-[calc(100vh-200px)] min-h-[600px] w-full rounded-lg border"
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
