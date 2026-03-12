"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onUploadComplete: (importId: string) => void;
  onError: (error: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function UploadZone({ onUploadComplete, onError }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return "Only PDF files are accepted";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 10 MB limit";
    }
    return null;
  };

  const uploadFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        onError(error);
        return;
      }

      setValidationError(null);
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        setUploading(false);
        xhrRef.current = null;

        if (xhr.status === 201) {
          const data = JSON.parse(xhr.responseText);
          onUploadComplete(data.importId);
        } else {
          let message = "Upload failed";
          try {
            const data = JSON.parse(xhr.responseText);
            message = data.error || message;
          } catch {
            // ignore parse error
          }
          onError(message);
        }
      });

      xhr.addEventListener("error", () => {
        setUploading(false);
        xhrRef.current = null;
        onError("Upload failed. Please try again.");
      });

      xhr.open("POST", "/api/imports/upload");
      xhr.send(formData);
    },
    [onUploadComplete, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleCancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploading(false);
    setProgress(0);
  }, []);

  return (
    <div
      data-testid="upload-zone"
      onClick={() => !uploading && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        uploading && "pointer-events-none"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading ? (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Uploading...</p>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            className="pointer-events-auto"
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop your PDF here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF files only, up to 10 MB
          </p>
        </>
      )}

      {validationError && (
        <p className="mt-2 text-sm text-destructive">{validationError}</p>
      )}
    </div>
  );
}
