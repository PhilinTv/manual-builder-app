"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Eye, GitCompare, RotateCcw } from "lucide-react";
import { VersionViewerDialog } from "./version-viewer";
import { VersionDiff } from "./version-diff";
import { VersionDiffMobile } from "./version-diff-mobile";
import { RollbackDialog } from "./rollback-dialog";

interface VersionEntry {
  id: string;
  version: number;
  authorId: string;
  authorName: string;
  note: string | null;
  changeSummary: string | null;
  createdAt: string;
}

interface ManualSnapshot {
  productName: string;
  overview: any;
  instructions: any[];
  warnings: any[];
}

interface VersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualId: string;
  onRollbackComplete?: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export function VersionHistoryPanel({
  open,
  onOpenChange,
  manualId,
  onRollbackComplete,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [viewerVersion, setViewerVersion] = useState<number | null>(null);
  const [viewerData, setViewerData] = useState<{
    content: ManualSnapshot;
    version: number;
    authorName: string;
    createdAt: string;
  } | null>(null);
  const [compareVersions, setCompareVersions] = useState<{
    left: ManualSnapshot;
    right: ManualSnapshot;
    leftLabel: string;
    rightLabel: string;
  } | null>(null);
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);

  const fetchVersions = useCallback(async () => {
    const res = await fetch(`/api/manuals/${manualId}/versions`);
    if (res.ok) {
      const data = await res.json();
      setVersions(data.versions);
    }
  }, [manualId]);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open, fetchVersions]);

  async function handleView(versionNumber: number) {
    const res = await fetch(`/api/manuals/${manualId}/versions/${versionNumber}`);
    if (res.ok) {
      const data = await res.json();
      setViewerData({
        content: data.content as ManualSnapshot,
        version: data.version,
        authorName: data.authorName,
        createdAt: data.createdAt,
      });
      setViewerVersion(versionNumber);
    }
  }

  async function handleCompare(versionNumber: number) {
    // Compare this version with the previous one
    const prevVersion = versionNumber > 1 ? versionNumber - 1 : null;
    if (!prevVersion) return;

    const [resA, resB] = await Promise.all([
      fetch(`/api/manuals/${manualId}/versions/${prevVersion}`),
      fetch(`/api/manuals/${manualId}/versions/${versionNumber}`),
    ]);

    if (resA.ok && resB.ok) {
      const dataA = await resA.json();
      const dataB = await resB.json();
      setCompareVersions({
        left: dataA.content as ManualSnapshot,
        right: dataB.content as ManualSnapshot,
        leftLabel: `Version ${prevVersion}`,
        rightLabel: `Version ${versionNumber}`,
      });
    }
  }

  async function handleNoteSave(versionId: string) {
    await fetch(`/api/manuals/${manualId}/versions/${versionId}/note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteValue }),
    });
    setEditingNoteId(null);
    fetchVersions();
  }

  function handleEditNote(entry: VersionEntry) {
    setEditingNoteId(entry.id);
    setNoteValue(entry.note || "");
  }

  async function handleRollbackConfirm() {
    if (rollbackVersion === null) return;
    setRollbackVersion(null);
    await fetchVersions();
    onRollbackComplete?.();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          data-testid="version-history-panel"
          className="w-full sm:max-w-[400px] overflow-y-auto"
          side="right"
        >
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>Browse and manage manual versions</SheetDescription>
          </SheetHeader>

          <div data-testid="version-list" className="mt-4 space-y-3">
            {versions.map((entry) => (
              <div
                key={entry.id}
                data-testid="version-entry"
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    data-testid="version-number"
                    className="font-semibold text-sm"
                  >
                    Version {entry.version}
                  </span>
                  <span
                    data-testid="version-date"
                    className="text-xs text-muted-foreground"
                  >
                    {formatRelativeDate(entry.createdAt)}
                  </span>
                </div>

                <div
                  data-testid="version-author"
                  className="text-xs text-muted-foreground"
                >
                  {entry.authorName}
                </div>

                {entry.changeSummary && (
                  <p className="text-xs text-muted-foreground">
                    {entry.changeSummary}
                  </p>
                )}

                {editingNoteId === entry.id ? (
                  <Input
                    data-testid="version-note-input"
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    onBlur={() => handleNoteSave(entry.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNoteSave(entry.id);
                    }}
                    placeholder="Add a note..."
                    className="text-xs h-7"
                    autoFocus
                  />
                ) : (
                  entry.note && (
                    <p className="text-xs italic text-muted-foreground">
                      {entry.note}
                    </p>
                  )
                )}

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleView(entry.version)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCompare(entry.version)}
                  >
                    <GitCompare className="mr-1 h-3 w-3" />
                    Compare
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRollbackVersion(entry.version)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Rollback
                  </Button>
                  <Button
                    data-testid="edit-note-btn"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={() => handleEditNote(entry)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No versions yet. Publish the manual to create the first version.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {viewerVersion !== null && viewerData && (
        <VersionViewerDialog
          open={viewerVersion !== null}
          onOpenChange={(open) => {
            if (!open) {
              setViewerVersion(null);
              setViewerData(null);
            }
          }}
          content={viewerData.content}
          version={viewerData.version}
          authorName={viewerData.authorName}
          createdAt={viewerData.createdAt}
          onRollback={() => {
            setViewerVersion(null);
            setViewerData(null);
            setRollbackVersion(viewerData.version);
          }}
        />
      )}

      {compareVersions && (
        <>
          <div className="hidden lg:block">
            <VersionDiff
              open={!!compareVersions}
              onOpenChange={(open) => {
                if (!open) setCompareVersions(null);
              }}
              leftVersion={compareVersions.left}
              rightVersion={compareVersions.right}
              leftLabel={compareVersions.leftLabel}
              rightLabel={compareVersions.rightLabel}
            />
          </div>
          <div className="lg:hidden">
            <VersionDiffMobile
              open={!!compareVersions}
              onOpenChange={(open) => {
                if (!open) setCompareVersions(null);
              }}
              leftVersion={compareVersions.left}
              rightVersion={compareVersions.right}
              leftLabel={compareVersions.leftLabel}
              rightLabel={compareVersions.rightLabel}
            />
          </div>
        </>
      )}

      <RollbackDialog
        open={rollbackVersion !== null}
        onOpenChange={(open) => {
          if (!open) setRollbackVersion(null);
        }}
        manualId={manualId}
        versionNumber={rollbackVersion ?? 0}
        onConfirm={handleRollbackConfirm}
      />
    </>
  );
}
