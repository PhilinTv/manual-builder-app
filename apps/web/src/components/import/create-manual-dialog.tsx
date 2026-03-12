"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UploadZone } from "./upload-zone";
import { ProcessingStatus } from "./processing-status";
import { cn } from "@/lib/utils";

interface CreateManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "choose" | "upload" | "processing";

export function CreateManualDialog({
  open,
  onOpenChange,
}: CreateManualDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [importId, setImportId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreateFromScratch = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/manuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: "Untitled Manual" }),
      });
      if (res.ok) {
        const data = await res.json();
        onOpenChange(false);
        router.push(`/manuals/${data.manual.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUploadComplete = (id: string) => {
    setImportId(id);
    setStep("processing");
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state on close
      setStep("choose");
      setImportId(null);
      setUploadError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Manual</DialogTitle>
          <DialogDescription>
            {step === "choose" && "Choose how to create your manual."}
            {step === "upload" && "Upload a PDF to import."}
            {step === "processing" && "Processing your PDF..."}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid gap-3">
            <button
              onClick={() => setStep("upload")}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Import from PDF</p>
                <p className="text-xs text-muted-foreground">
                  Upload a PDF and extract content automatically
                </p>
              </div>
            </button>

            <button
              onClick={handleCreateFromScratch}
              disabled={creating}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50",
                creating && "opacity-50"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                {creating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Create from scratch</p>
                <p className="text-xs text-muted-foreground">
                  Start with a blank manual
                </p>
              </div>
            </button>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-3">
            <UploadZone
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>
        )}

        {step === "processing" && importId && (
          <ProcessingStatus importId={importId} />
        )}
      </DialogContent>
    </Dialog>
  );
}
