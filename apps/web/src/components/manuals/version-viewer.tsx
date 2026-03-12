"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface ManualSnapshot {
  productName: string;
  overview: any;
  instructions: any[];
  warnings: any[];
}

interface VersionViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ManualSnapshot;
  version: number;
  authorName: string;
  createdAt: string;
  onRollback: () => void;
}

function renderTiptapText(json: any): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (json.content) {
    return json.content
      .map((node: any) => {
        if (node.type === "text") return node.text || "";
        if (node.content) return renderTiptapText(node);
        return "";
      })
      .join("");
  }
  return JSON.stringify(json);
}

export function VersionViewerDialog({
  open,
  onOpenChange,
  content,
  version,
  authorName,
  createdAt,
  onRollback,
}: VersionViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="version-viewer-dialog"
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Version {version}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              by {authorName} on {new Date(createdAt).toLocaleDateString()}
            </span>
          </DialogTitle>
          <DialogDescription>
            Read-only view of this version&apos;s content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Product Name */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Product Name</h3>
            <p className="text-sm border rounded-md p-2 bg-muted">
              {content.productName}
            </p>
          </div>

          {/* Overview */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Overview</h3>
            <div className="text-sm border rounded-md p-2 bg-muted whitespace-pre-wrap">
              {renderTiptapText(content.overview) || "No overview"}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-semibold mb-1">
              Chapters ({content.instructions?.length || 0})
            </h3>
            <div className="space-y-2">
              {(content.instructions || []).map((inst: any, i: number) => (
                <div key={inst.id || i} className="border rounded-md p-2 bg-muted">
                  <p className="font-medium text-sm">{inst.title || `Chapter ${i + 1}`}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {renderTiptapText(inst.body)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div>
            <h3 className="text-sm font-semibold mb-1">
              Warnings ({content.warnings?.length || 0})
            </h3>
            <div className="space-y-2">
              {(content.warnings || []).map((warn: any, i: number) => (
                <div
                  key={warn.id || i}
                  className="border rounded-md p-2 bg-muted border-l-4 border-l-yellow-500"
                >
                  <p className="font-medium text-sm">
                    [{warn.severity || "WARNING"}] {warn.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {warn.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onRollback}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Rollback to this version
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
