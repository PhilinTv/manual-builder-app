"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { WarningDialog } from "@/components/warnings/warning-dialog";
import { DeleteWarningDialog } from "@/components/warnings/delete-warning-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "DANGER" | "WARNING" | "CAUTION";

interface DangerWarning {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  createdAt: string;
  updatedAt: string;
}

const severityCardColors: Record<Severity, string> = {
  DANGER: "border-red-200 bg-red-50",
  WARNING: "border-orange-200 bg-orange-50",
  CAUTION: "border-yellow-200 bg-yellow-50",
};

const filters: { label: string; value: Severity | null; testId: string }[] = [
  { label: "All", value: null, testId: "filter-all" },
  { label: "Danger", value: "DANGER", testId: "filter-danger" },
  { label: "Warning", value: "WARNING", testId: "filter-warning" },
  { label: "Caution", value: "CAUTION", testId: "filter-caution" },
];

export function WarningLibrary() {
  const [warnings, setWarnings] = useState<DangerWarning[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWarning, setEditWarning] = useState<DangerWarning | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteWarningId, setDeleteWarningId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWarnings = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (severityFilter) params.set("severity", severityFilter);

    const res = await fetch(`/api/warnings?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setWarnings(data.warnings);
    }
  }, [search, severityFilter]);

  useEffect(() => {
    fetchWarnings();
  }, [fetchWarnings]);

  function handleSearchChange(value: string) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  }

  function handleEdit(warning: DangerWarning) {
    setEditWarning(warning);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditWarning(null);
    setDialogOpen(true);
  }

  function handleDeleteClick(id: string) {
    setDeleteWarningId(id);
    setDeleteDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Search and Create */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search warnings..."
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Create Warning
        </Button>
      </div>

      {/* Severity Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.testId}
            data-testid={filter.testId}
            onClick={() => setSeverityFilter(filter.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              severityFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Warning Cards */}
      {warnings.length === 0 ? (
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center"
        >
          <p className="text-muted-foreground">Create your first warning</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warnings.map((warning) => (
            <div
              key={warning.id}
              data-testid="warning-card"
              data-severity={warning.severity}
              className={cn(
                "rounded-lg border p-4 space-y-3",
                severityCardColors[warning.severity]
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <SeverityBadge severity={warning.severity} />
                  <h3 className="font-semibold">{warning.title}</h3>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(warning)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(warning.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {warning.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <WarningDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditWarning(null);
        }}
        warning={editWarning}
        onSuccess={fetchWarnings}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteWarningDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        warningId={deleteWarningId}
        onSuccess={fetchWarnings}
      />
    </div>
  );
}
