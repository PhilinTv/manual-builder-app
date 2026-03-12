"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingStatusProps {
  importId: string;
}

interface ImportStatus {
  id: string;
  status: string;
  errorMessage?: string | null;
  sourceFilename: string;
}

export function ProcessingStatus({ importId }: ProcessingStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/imports/${importId}`);
      if (!res.ok) {
        setError("Failed to fetch import status");
        return;
      }
      const data: ImportStatus = await res.json();
      setStatus(data);

      if (data.status === "READY_FOR_REVIEW") {
        router.push(`/imports/${importId}/review`);
      }
    } catch {
      setError("Failed to fetch import status");
    }
  }, [importId, router]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch(`/api/imports/${importId}`, { method: "POST" });
      if (res.ok) {
        // Reset status and restart polling
        setStatus((prev) =>
          prev ? { ...prev, status: "UPLOADING", errorMessage: null } : prev
        );
      } else {
        setError("Failed to retry import");
      }
    } catch {
      setError("Failed to retry import");
    } finally {
      setRetrying(false);
    }
  };

  if (status?.status === "FAILED") {
    return (
      <div
        data-testid="import-error"
        className="flex flex-col items-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-8"
      >
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          Import failed
        </p>
        {status.errorMessage && (
          <p className="text-xs text-muted-foreground">{status.errorMessage}</p>
        )}
        <Button
          data-testid="retry-button"
          onClick={handleRetry}
          disabled={retrying}
          variant="outline"
        >
          {retrying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Retry Import
        </Button>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div
        data-testid="import-error"
        className="flex flex-col items-center gap-4 p-8"
      >
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-medium">Extracting content...</p>
      {status?.sourceFilename && (
        <p className="text-xs text-muted-foreground">
          Processing {status.sourceFilename}
        </p>
      )}
    </div>
  );
}
