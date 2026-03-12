"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { generateTextDiff } from "@/lib/utils/diff-summary";

interface ManualSnapshot {
  productName: string;
  overview: any;
  instructions: any[];
  warnings: any[];
}

interface VersionDiffProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftVersion: ManualSnapshot;
  rightVersion: ManualSnapshot;
  leftLabel: string;
  rightLabel: string;
}

function textFromJson(json: any): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (json.content) {
    return json.content
      .map((node: any) => {
        if (node.type === "text") return node.text || "";
        if (node.content) return textFromJson(node);
        return "";
      })
      .join("");
  }
  return JSON.stringify(json);
}

function DiffHighlight({ oldText, newText }: { oldText: string; newText: string }) {
  const diffs = generateTextDiff(oldText, newText);

  return (
    <span>
      {diffs.map((d, i) => {
        if (d.type === 0) return <span key={i}>{d.text}</span>;
        if (d.type === 1)
          return (
            <span key={i} className="diff-added bg-green-100 dark:bg-green-900/30">
              {d.text}
            </span>
          );
        if (d.type === -1)
          return (
            <span key={i} className="diff-removed bg-red-100 dark:bg-red-900/30">
              {d.text}
            </span>
          );
        return null;
      })}
    </span>
  );
}

function SectionDiff({
  title,
  oldText,
  newText,
}: {
  title: string;
  oldText: string;
  newText: string;
}) {
  if (oldText === newText) {
    return (
      <div className="mb-4">
        <h4 className="text-xs font-semibold mb-1 text-muted-foreground">{title}</h4>
        <p className="text-sm whitespace-pre-wrap">{oldText || "(empty)"}</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold mb-1 text-muted-foreground">{title}</h4>
      <p className="text-sm whitespace-pre-wrap">
        <DiffHighlight oldText={oldText} newText={newText} />
      </p>
    </div>
  );
}

export function VersionDiff({
  open,
  onOpenChange,
  leftVersion,
  rightVersion,
  leftLabel,
  rightLabel,
}: VersionDiffProps) {
  const leftOverview = textFromJson(leftVersion.overview);
  const rightOverview = textFromJson(rightVersion.overview);

  const leftInstructions = (leftVersion.instructions || [])
    .map((i: any) => `${i.title}: ${textFromJson(i.body)}`)
    .join("\n");
  const rightInstructions = (rightVersion.instructions || [])
    .map((i: any) => `${i.title}: ${textFromJson(i.body)}`)
    .join("\n");

  const leftWarnings = (leftVersion.warnings || [])
    .map((w: any) => `[${w.severity}] ${w.title}: ${w.description}`)
    .join("\n");
  const rightWarnings = (rightVersion.warnings || [])
    .map((w: any) => `[${w.severity}] ${w.title}: ${w.description}`)
    .join("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="version-diff"
        className="max-w-4xl max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            Comparing {leftLabel} and {rightLabel}
          </DialogTitle>
          <DialogDescription>
            Side-by-side comparison with diff highlighting
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Left pane */}
          <div data-testid="diff-pane-left" className="space-y-4 border rounded-md p-3">
            <h3 className="text-sm font-semibold">{leftLabel}</h3>
            <SectionDiff
              title="Product Name"
              oldText={leftVersion.productName}
              newText={rightVersion.productName}
            />
            <SectionDiff
              title="Overview"
              oldText={leftOverview}
              newText={rightOverview}
            />
            <SectionDiff
              title="Chapters"
              oldText={leftInstructions}
              newText={rightInstructions}
            />
            <SectionDiff
              title="Warnings"
              oldText={leftWarnings}
              newText={rightWarnings}
            />
          </div>

          {/* Right pane */}
          <div data-testid="diff-pane-right" className="space-y-4 border rounded-md p-3">
            <h3 className="text-sm font-semibold">{rightLabel}</h3>
            <SectionDiff
              title="Product Name"
              oldText={leftVersion.productName}
              newText={rightVersion.productName}
            />
            <SectionDiff
              title="Overview"
              oldText={leftOverview}
              newText={rightOverview}
            />
            <SectionDiff
              title="Chapters"
              oldText={leftInstructions}
              newText={rightInstructions}
            />
            <SectionDiff
              title="Warnings"
              oldText={leftWarnings}
              newText={rightWarnings}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
