"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { type JSONContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/constants/languages";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ConfidenceBadge } from "./confidence-badge";
import { markdownToTiptap } from "@/services/import/markdown-to-tiptap";

interface Instruction {
  title: string;
  body: JSONContent;
}

interface Warning {
  severity: string;
  text: string;
  confidence?: number;
}

interface ExtractedData {
  productName: string;
  overview: string;
  instructions: { title: string; body: string }[];
  warnings?: Warning[];
  tableOfContents?: string[];
  pageCount?: number;
}

interface Confidence {
  productName: number;
  overview: number;
  instructions: number;
  tableOfContents?: number;
}

interface ReviewFormProps {
  importId: string;
  extractedData: ExtractedData;
  confidence: Confidence;
  detectedLanguage: string;
  rawTextLength: number;
}

function toTiptap(text: string | undefined): JSONContent {
  if (!text) return { type: "doc", content: [{ type: "paragraph" }] };
  return markdownToTiptap(text);
}

export function ReviewForm({
  importId,
  extractedData,
  confidence,
  detectedLanguage,
  rawTextLength,
}: ReviewFormProps) {
  const router = useRouter();
  const [productName, setProductName] = useState(extractedData.productName);
  const [language, setLanguage] = useState(detectedLanguage);
  const [overview, setOverview] = useState<JSONContent>(
    toTiptap(extractedData.overview)
  );
  const [instructions, setInstructions] = useState<Instruction[]>(() => {
    const raw = Array.isArray(extractedData.instructions)
      ? extractedData.instructions
      : [];
    return raw.map((inst) => ({
      title: inst.title,
      body: toTiptap(inst.body),
    }));
  });
  const [warnings, setWarnings] = useState<Warning[]>(
    Array.isArray(extractedData.warnings) ? extractedData.warnings : []
  );
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const isScannedPdf = rawTextLength < 100;

  const updateInstructionTitle = (index: number, title: string) => {
    setInstructions((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, title } : inst))
    );
  };

  const updateInstructionBody = (index: number, body: JSONContent) => {
    setInstructions((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, body } : inst))
    );
  };

  const removeInstruction = (index: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions((prev) => [
      ...prev,
      { title: "", body: { type: "doc", content: [{ type: "paragraph" }] } },
    ]);
  };

  const updateWarning = (
    index: number,
    field: "severity" | "text",
    value: string
  ) => {
    setWarnings((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    );
  };

  const removeWarning = (index: number) => {
    setWarnings((prev) => prev.filter((_, i) => i !== index));
  };

  const addWarning = () => {
    setWarnings((prev) => [...prev, { severity: "CAUTION", text: "" }]);
  };

  const handleConfirm = async () => {
    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/imports/${importId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          overview,
          instructions: instructions.map((inst) => ({
            title: inst.title,
            body: inst.body,
          })),
          warnings: warnings.length > 0 ? warnings : undefined,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Manual created successfully");
        router.push(`/manuals/${data.manualId}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create manual");
      }
    } catch {
      toast.error("Failed to create manual");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      const res = await fetch(`/api/imports/${importId}/discard`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Import discarded");
        router.push("/manuals");
      } else {
        toast.error("Failed to discard import");
      }
    } catch {
      toast.error("Failed to discard import");
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <div data-testid="review-form" className="space-y-6">
      {isScannedPdf && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Scanned or image-based PDF detected
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Very little text was extracted from this PDF. The content below may
              be incomplete. Consider using a text-based PDF for better results.
            </p>
          </div>
        </div>
      )}

      {/* Product Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="productName" className="text-sm font-medium">
            Product Name
          </label>
          <ConfidenceBadge confidence={confidence.productName} />
        </div>
        <Input
          id="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Language</label>
        <Select
          data-testid="language-select"
          value={language}
          onValueChange={setLanguage}
        >
          <SelectTrigger data-testid="language-select">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            Overview
          </label>
          <ConfidenceBadge confidence={confidence.overview} />
        </div>
        <TiptapEditor
          content={overview}
          onChange={setOverview}
          editable={true}
          placeholder="Product overview..."
        />
      </div>

      {/* Instructions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Chapters</h3>
          <ConfidenceBadge confidence={confidence.instructions} />
        </div>
        {instructions.map((inst, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={inst.title}
                onChange={(e) => updateInstructionTitle(i, e.target.value)}
                placeholder="Section title"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <TiptapEditor
              content={inst.body}
              onChange={(json) => updateInstructionBody(i, json)}
              editable={true}
              placeholder="Section content..."
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
          Add chapter
        </Button>
      </div>

      {/* Warnings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Warnings</h3>
        {warnings.map((warning, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-yellow-200 bg-yellow-50/50 p-3">
            <div className="flex items-center gap-2">
              <Select
                value={warning.severity}
                onValueChange={(v) => updateWarning(i, "severity", v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DANGER">Danger</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="CAUTION">Caution</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={warning.text}
                onChange={(e) => updateWarning(i, "text", e.target.value)}
                placeholder="Warning text"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeWarning(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addWarning}>
          Add warning
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
        <Button
          variant="destructive"
          onClick={handleDiscard}
          disabled={discarding || submitting}
        >
          {discarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Discard Import
        </Button>
        <Button onClick={handleConfirm} disabled={submitting || discarding}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <CheckCircle className="mr-2 h-4 w-4" />
          Confirm & Create Manual
        </Button>
      </div>
    </div>
  );
}
