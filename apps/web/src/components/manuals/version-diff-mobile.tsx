"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateTextDiff } from "@/lib/utils/diff-summary";

interface ManualSnapshot {
  productName: string;
  overview: any;
  instructions: any[];
  warnings: any[];
}

interface VersionDiffMobileProps {
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

function hasChanged(a: string, b: string) {
  return a !== b;
}

export function VersionDiffMobile({
  open,
  onOpenChange,
  leftVersion,
  rightVersion,
  leftLabel,
  rightLabel,
}: VersionDiffMobileProps) {
  const [showRight, setShowRight] = useState(false);

  const current = showRight ? rightVersion : leftVersion;
  const currentLabel = showRight ? rightLabel : leftLabel;

  const overviewA = textFromJson(leftVersion.overview);
  const overviewB = textFromJson(rightVersion.overview);
  const instructionsA = (leftVersion.instructions || [])
    .map((i: any) => `${i.title}: ${textFromJson(i.body)}`)
    .join("\n");
  const instructionsB = (rightVersion.instructions || [])
    .map((i: any) => `${i.title}: ${textFromJson(i.body)}`)
    .join("\n");
  const warningsA = (leftVersion.warnings || [])
    .map((w: any) => `[${w.severity}] ${w.title}: ${w.description}`)
    .join("\n");
  const warningsB = (rightVersion.warnings || [])
    .map((w: any) => `[${w.severity}] ${w.title}: ${w.description}`)
    .join("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="version-diff-mobile"
        className="max-w-full max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
          <DialogDescription>Toggle between versions to compare</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mt-2">
          <div
            data-testid="version-toggle"
            className="inline-flex rounded-md border"
            role="group"
          >
            <Button
              variant={!showRight ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setShowRight(false)}
            >
              {leftLabel}
            </Button>
            <Button
              variant={showRight ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setShowRight(true)}
            >
              {rightLabel}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div
            className={
              hasChanged(leftVersion.productName, rightVersion.productName)
                ? "border-l-4 border-l-blue-500 pl-3"
                : "pl-3"
            }
          >
            <h4 className="text-xs font-semibold text-muted-foreground">Product Name</h4>
            <p className="text-sm">
              {hasChanged(leftVersion.productName, rightVersion.productName) ? (
                <DiffHighlight
                  oldText={leftVersion.productName}
                  newText={rightVersion.productName}
                />
              ) : (
                current.productName
              )}
            </p>
          </div>

          <div
            className={
              hasChanged(overviewA, overviewB)
                ? "border-l-4 border-l-blue-500 pl-3"
                : "pl-3"
            }
          >
            <h4 className="text-xs font-semibold text-muted-foreground">Overview</h4>
            <p className="text-sm whitespace-pre-wrap">
              {hasChanged(overviewA, overviewB) ? (
                <DiffHighlight oldText={overviewA} newText={overviewB} />
              ) : (
                textFromJson(current.overview) || "(empty)"
              )}
            </p>
          </div>

          <div
            className={
              hasChanged(instructionsA, instructionsB)
                ? "border-l-4 border-l-blue-500 pl-3"
                : "pl-3"
            }
          >
            <h4 className="text-xs font-semibold text-muted-foreground">Chapters</h4>
            <p className="text-sm whitespace-pre-wrap">
              {hasChanged(instructionsA, instructionsB) ? (
                <DiffHighlight oldText={instructionsA} newText={instructionsB} />
              ) : (
                textFromJson(current.instructions) || "(none)"
              )}
            </p>
          </div>

          <div
            className={
              hasChanged(warningsA, warningsB)
                ? "border-l-4 border-l-blue-500 pl-3"
                : "pl-3"
            }
          >
            <h4 className="text-xs font-semibold text-muted-foreground">Warnings</h4>
            <p className="text-sm whitespace-pre-wrap">
              {hasChanged(warningsA, warningsB) ? (
                <DiffHighlight oldText={warningsA} newText={warningsB} />
              ) : (
                textFromJson(current.warnings) || "(none)"
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
