"use client";

import { ReviewForm } from "@/components/import/review-form";
import { PdfViewer } from "@/components/import/pdf-viewer";

interface ReviewPageClientProps {
  importId: string;
  sourceFilename: string;
  extractedData: any;
  confidence: any;
  detectedLanguage: string;
  rawTextLength: number;
}

export function ReviewPageClient({
  importId,
  sourceFilename,
  extractedData,
  confidence,
  detectedLanguage,
  rawTextLength,
}: ReviewPageClientProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Review Import</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review and edit the extracted content before creating the manual.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* PDF viewer - left on desktop, top on mobile, sticky */}
        <div className="order-1 lg:sticky lg:top-4 lg:self-start">
          <PdfViewer importId={importId} filename={sourceFilename} />
        </div>

        {/* Form - right on desktop, bottom on mobile */}
        <div className="order-2">
          <ReviewForm
            importId={importId}
            extractedData={extractedData}
            confidence={confidence}
            detectedLanguage={detectedLanguage}
            rawTextLength={rawTextLength}
          />
        </div>
      </div>
    </div>
  );
}
