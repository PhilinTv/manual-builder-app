"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { type JSONContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { InstructionBlock } from "@/components/manuals/instruction-block";
import { WarningBlock } from "@/components/manuals/warning-block";
import { WarningPicker } from "@/components/manuals/warning-picker";
import { LibraryWarningCard } from "@/components/manuals/library-warning-card";
import { ManageAccess } from "@/components/manuals/manage-access";
import { DeleteManualDialog } from "@/components/manuals/delete-manual-dialog";
import { FavoriteToggle } from "@/components/manuals/favorite-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { StaleBanner } from "@/components/manuals/stale-banner";
import { useNotifications } from "@/components/notifications/notification-provider";

interface Instruction {
  id: string;
  title: string;
  body: JSONContent | null;
  order: number;
}

interface Warning {
  id: string;
  title: string;
  description: string;
  severity: string;
  order: number;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
}

interface ManualData {
  id: string;
  productName: string;
  overview: JSONContent | null;
  instructions: Instruction[] | null;
  warnings: Warning[] | null;
  status: string;
  createdBy: { id: string; name: string };
  assignees: Assignee[];
}

interface ManualEditorProps {
  manual: ManualData;
  canEdit: boolean;
  userRole: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export function ManualEditor({ manual, canEdit, userRole }: ManualEditorProps) {
  const { staleBanner, clearStaleBanner } = useNotifications();
  const [productName, setProductName] = useState(manual.productName);
  const [overview, setOverview] = useState<JSONContent | null>(manual.overview);
  const [instructions, setInstructions] = useState<Instruction[]>(
    manual.instructions || []
  );
  const [warnings, setWarnings] = useState<Warning[]>(manual.warnings || []);
  const [status, setStatus] = useState(manual.status);
  const [assignees, setAssignees] = useState<Assignee[]>(manual.assignees);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [libraryWarnings, setLibraryWarnings] = useState<any[]>([]);
  const [initialFavorited, setInitialFavorited] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAdmin = userRole === "ADMIN";

  // Fetch library warnings on mount
  useEffect(() => {
    async function fetchLibraryWarnings() {
      const res = await fetch(`/api/manuals/${manual.id}/warnings`);
      if (res.ok) {
        const data = await res.json();
        setLibraryWarnings(data.warnings);
      }
    }
    fetchLibraryWarnings();
  }, [manual.id]);

  // Fetch initial favorite state
  useEffect(() => {
    async function fetchFavoriteState() {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setInitialFavorited(data.manualIds.includes(manual.id));
      }
    }
    fetchFavoriteState();
  }, [manual.id]);

  const save = useCallback(
    async (data: Record<string, any>) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/manuals/${manual.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("idle");
      }
    },
    [manual.id]
  );

  const debouncedSave = useCallback(
    (data: Record<string, any>) => {
      if (!canEdit) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => save(data), 1000);
    },
    [save, canEdit]
  );

  // Auto-save on field changes
  useEffect(() => {
    if (!canEdit) return;
    debouncedSave({ productName, overview, instructions, warnings });
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [productName, overview, instructions, warnings, debouncedSave, canEdit]);

  async function handlePublish() {
    const res = await fetch(`/api/manuals/${manual.id}/publish`, {
      method: "POST",
    });
    if (res.ok) {
      setStatus("PUBLISHED");
      toast.success("Manual published successfully");
    }
  }

  function addInstruction() {
    setInstructions((prev) => [
      ...prev,
      { id: generateId(), title: "", body: null, order: prev.length },
    ]);
  }

  function updateInstruction(index: number, data: Partial<Instruction>) {
    setInstructions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...data } : item))
    );
  }

  function removeInstruction(index: number) {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveInstruction(from: number, to: number) {
    setInstructions((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((item, i) => ({ ...item, order: i }));
    });
  }

  function addWarning() {
    setWarnings((prev) => [
      ...prev,
      {
        id: generateId(),
        title: "",
        description: "",
        severity: "WARNING",
        order: prev.length,
      },
    ]);
  }

  function updateWarning(index: number, data: Partial<Warning>) {
    setWarnings((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...data } : item))
    );
  }

  function removeWarning(index: number) {
    setWarnings((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLibraryWarningAdded(manualWarning: any) {
    setLibraryWarnings((prev) => [
      ...prev,
      {
        ...manualWarning.dangerWarning,
        order: manualWarning.order,
        manualWarningId: manualWarning.id,
      },
    ]);
    toast.success("Warning added to manual");
  }

  async function handleRemoveLibraryWarning(dangerWarningId: string) {
    const res = await fetch(`/api/manuals/${manual.id}/warnings`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dangerWarningId }),
    });
    if (res.ok) {
      setLibraryWarnings((prev) => prev.filter((w) => w.id !== dangerWarningId));
      toast.success("Warning removed from manual");
    }
  }

  async function refreshAssignees() {
    const res = await fetch(`/api/manuals/${manual.id}`);
    if (res.ok) {
      const data = await res.json();
      setAssignees(
        data.manual.assignments.map((a: any) => a.user)
      );
    }
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-8">
        {/* Stale Content Banner */}
        <StaleBanner
          visible={staleBanner?.visible === true && staleBanner.manualId === manual.id}
          updatedBy={staleBanner?.updatedBy ?? ""}
          onReload={clearStaleBanner}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FavoriteToggle
              manualId={manual.id}
              initialFavorited={initialFavorited}
            />
            <span
              data-testid="manual-status-badge"
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                status === "DRAFT"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              )}
            >
              {status === "DRAFT" ? "Draft" : "Published"}
            </span>
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-muted-foreground">Saved</span>
            )}
          </div>
          <div className="flex gap-2">
            {canEdit && status === "DRAFT" && (
              <Button onClick={handlePublish}>Publish</Button>
            )}
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Product Name */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Product Name</h2>
          <Input
            data-testid="product-name-input"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={!canEdit}
            placeholder="Enter product name"
          />
        </div>

        {/* Product Overview */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Product Overview</h2>
          <div data-testid="overview-editor">
            <TiptapEditor
              content={overview}
              onChange={setOverview}
              editable={canEdit}
              placeholder="Write a product overview..."
            />
          </div>
        </div>

        {/* Feature Instructions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Feature Instructions</h2>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addInstruction}>
                <Plus className="mr-1 h-4 w-4" />
                Add Instruction
              </Button>
            )}
          </div>
          {instructions.map((instruction, index) => (
            <InstructionBlock
              key={instruction.id}
              index={index}
              title={instruction.title}
              body={instruction.body}
              onChange={(data) => updateInstruction(index, data)}
              onRemove={() => removeInstruction(index)}
              onMoveUp={() => moveInstruction(index, index - 1)}
              onMoveDown={() => moveInstruction(index, index + 1)}
              editable={canEdit}
              isFirst={index === 0}
              isLast={index === instructions.length - 1}
            />
          ))}
        </div>

        {/* Danger Warnings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Danger Warnings</h2>

          {/* Library Warnings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Library Warnings</h3>
            {canEdit && (
              <WarningPicker
                manualId={manual.id}
                linkedWarningIds={libraryWarnings.map((w) => w.id)}
                onAdd={handleLibraryWarningAdded}
              />
            )}
            {libraryWarnings.map((warning) => (
              <LibraryWarningCard
                key={warning.id}
                id={warning.id}
                title={warning.title}
                description={warning.description}
                severity={warning.severity}
                onRemove={() => handleRemoveLibraryWarning(warning.id)}
                editable={canEdit}
              />
            ))}
          </div>

          {/* Custom Warnings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Custom Warnings</h3>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={addWarning}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add custom warning
                </Button>
              )}
            </div>
            {warnings.map((warning, index) => (
              <WarningBlock
                key={warning.id}
                index={index}
                title={warning.title}
                description={warning.description}
                severity={warning.severity}
                onChange={(data) => updateWarning(index, data)}
                onRemove={() => removeWarning(index)}
                editable={canEdit}
              />
            ))}
          </div>
        </div>

        {/* Manage Access (Admin only) */}
        {isAdmin && (
          <ManageAccess
            manualId={manual.id}
            assignees={assignees}
            onUpdate={refreshAssignees}
          />
        )}
      </div>

      {/* Table of Contents - sticky sidebar */}
      <div className="hidden lg:block">
        <div
          data-testid="table-of-contents"
          className="sticky top-6 w-48 space-y-2 rounded-lg border p-4"
        >
          <h3 className="text-sm font-semibold">Contents</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground">Product Overview</a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">Feature Instructions</a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">Danger Warnings</a>
            </li>
            {isAdmin && (
              <li>
                <a href="#" className="hover:text-foreground">Manage Access</a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <DeleteManualDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        manualId={manual.id}
      />
    </div>
  );
}
