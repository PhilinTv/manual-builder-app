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
import { VersionHistoryPanel } from "@/components/manuals/version-history-panel";
import { LanguageSwitcher } from "@/components/manuals/language-switcher";
import { TranslationEditor } from "@/components/manuals/translation-editor";
import { TranslationEditorMobile } from "@/components/manuals/translation-editor-mobile";
import { PublishWarningDialog } from "@/components/manuals/publish-warning-dialog";
import { ChangePrimaryLanguageDialog } from "@/components/manuals/change-primary-language-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Clock } from "lucide-react";
import { StaleBanner } from "@/components/manuals/stale-banner";
import { ExportButton } from "@/components/pdf/export-button";
import { PreviewButton } from "@/components/pdf/preview-button";
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
  primaryLanguage?: string;
  createdBy: { id: string; name: string };
  assignees: Assignee[];
}

interface LanguageEntry {
  code: string;
  name: string;
  translated: number;
  total: number;
  isPrimary?: boolean;
}

interface TranslationSection {
  section: string;
  content: any;
  status: "NOT_TRANSLATED" | "IN_PROGRESS" | "TRANSLATED";
  updatedAt: string;
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
    Array.isArray(manual.instructions) ? manual.instructions : []
  );
  const [warnings, setWarnings] = useState<Warning[]>(Array.isArray(manual.warnings) ? manual.warnings : []);
  const [status, setStatus] = useState(manual.status);
  const [assignees, setAssignees] = useState<Assignee[]>(manual.assignees);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [libraryWarnings, setLibraryWarnings] = useState<any[]>([]);
  const [initialFavorited, setInitialFavorited] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(manual.primaryLanguage || "en");
  const [primaryLanguage, setPrimaryLanguage] = useState(manual.primaryLanguage || "en");
  const [languages, setLanguages] = useState<LanguageEntry[]>([
    { code: manual.primaryLanguage || "en", name: "English", translated: 0, total: 0, isPrimary: true },
  ]);
  const [translations, setTranslations] = useState<TranslationSection[]>([]);
  const [publishWarningOpen, setPublishWarningOpen] = useState(false);
  const [incompleteLanguages, setIncompleteLanguages] = useState<any[]>([]);
  const [changePrimaryOpen, setChangePrimaryOpen] = useState(false);
  const [isDirtyAfterPublish, setIsDirtyAfterPublish] = useState(false);
  const [markingSection, setMarkingSection] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialRender = useRef(true);
  const translationRequestIdRef = useRef<Record<string, number>>({});
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

  // Fetch languages
  useEffect(() => {
    async function fetchLanguages() {
      const res = await fetch(`/api/manuals/${manual.id}/languages`);
      if (res.ok) {
        const data = await res.json();
        setPrimaryLanguage(data.primaryLanguage);
        if (data.languages.length > 0) {
          setLanguages(data.languages);
        }
      }
    }
    fetchLanguages();
  }, [manual.id]);

  // Fetch translations when switching to non-primary language
  useEffect(() => {
    if (currentLanguage === primaryLanguage) {
      setTranslations([]);
      return;
    }
    async function fetchTranslations() {
      const res = await fetch(`/api/manuals/${manual.id}/translations/${currentLanguage}`);
      if (res.ok) {
        const data = await res.json();
        setTranslations(data.sections);
      }
    }
    fetchTranslations();
  }, [manual.id, currentLanguage, primaryLanguage]);

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
    if (isInitialRender.current) {
      isInitialRender.current = false;
    } else if (status === "PUBLISHED") {
      setIsDirtyAfterPublish(true);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [productName, overview, instructions, warnings, debouncedSave, canEdit, status]);

  async function handlePublish() {
    // Check for incomplete translations
    const nonPrimaryLangs = languages.filter((l) => l.code !== primaryLanguage);
    const incomplete = nonPrimaryLangs.filter((l) => l.translated < l.total);
    if (incomplete.length > 0) {
      setIncompleteLanguages(incomplete);
      setPublishWarningOpen(true);
      return;
    }
    await doPublish();
  }

  async function doPublish() {
    const res = await fetch(`/api/manuals/${manual.id}/publish`, {
      method: "POST",
    });
    if (res.ok) {
      setStatus("PUBLISHED");
      setIsDirtyAfterPublish(false);
      toast.success("Manual published successfully");
      setPublishWarningOpen(false);
    }
  }

  async function refreshLanguages() {
    const res = await fetch(`/api/manuals/${manual.id}/languages`);
    if (res.ok) {
      const data = await res.json();
      setPrimaryLanguage(data.primaryLanguage);
      if (data.languages.length > 0) {
        setLanguages(data.languages);
      }
    }
  }

  async function handleTranslationUpdate(section: string, content: any) {
    const reqId = (translationRequestIdRef.current[section] || 0) + 1;
    translationRequestIdRef.current[section] = reqId;

    const res = await fetch(
      `/api/manuals/${manual.id}/translations/${currentLanguage}/${encodeURIComponent(section)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );
    // Discard stale response if a newer request (e.g. mark-as-translated) has been issued
    if (translationRequestIdRef.current[section] !== reqId) return;
    if (res.ok) {
      const data = await res.json();
      setTranslations((prev) =>
        prev.map((t) => (t.section === section ? { ...t, content: data.content, status: data.status } : t))
      );
    }
  }

  async function handleMarkTranslated(section: string, pendingContent?: any) {
    setMarkingSection(section);
    // Bump request id to invalidate any in-flight content saves
    const reqId = (translationRequestIdRef.current[section] || 0) + 1;
    translationRequestIdRef.current[section] = reqId;

    try {
      const body: Record<string, any> = { status: "TRANSLATED" };
      if (pendingContent !== undefined) {
        body.content = pendingContent;
      }
      const res = await fetch(
        `/api/manuals/${manual.id}/translations/${currentLanguage}/${encodeURIComponent(section)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTranslations((prev) =>
          prev.map((t) => (t.section === section ? { ...t, content: data.content, status: data.status } : t))
        );
        refreshLanguages();
      } else {
        toast.error("Failed to mark as translated");
      }
    } catch {
      toast.error("Failed to mark as translated");
    } finally {
      setMarkingSection(null);
    }
  }

  function getSourceSections() {
    const sections: { section: string; label: string; content: any }[] = [];
    sections.push({ section: "productName", label: "Product Name", content: productName });
    if (overview) {
      sections.push({ section: "overview", label: "Overview", content: overview });
    }
    for (const inst of instructions) {
      sections.push({
        section: `instruction:${inst.id}`,
        label: `Chapter: ${inst.title || "Untitled"}`,
        content: { title: inst.title, body: inst.body },
      });
    }
    for (const warn of warnings) {
      sections.push({
        section: `warning:${warn.id}`,
        label: `Warning: ${warn.title || "Untitled"}`,
        content: { title: warn.title, description: warn.description, severity: warn.severity },
      });
    }
    return sections;
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
            <LanguageSwitcher
              manualId={manual.id}
              currentLanguage={currentLanguage}
              primaryLanguage={primaryLanguage}
              languages={languages}
              onLanguageChange={(code) => setCurrentLanguage(code)}
              onAddLanguage={async (code) => {
                await refreshLanguages();
                setCurrentLanguage(code);
              }}
              canEdit={canEdit}
            />
            <Button
              data-testid="version-history-btn"
              variant="outline"
              size="icon"
              onClick={() => setVersionHistoryOpen(true)}
              title="Version History"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <PreviewButton manualId={manual.id} currentLanguage={currentLanguage} />
            <ExportButton manualId={manual.id} languages={languages} />
            {canEdit && (status === "DRAFT" || isDirtyAfterPublish) && (
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

        {currentLanguage !== primaryLanguage ? (
          <>
            {/* Translation Editor */}
            <div className="hidden lg:block">
              <TranslationEditor
                manualId={manual.id}
                sourceLanguage={primaryLanguage}
                targetLanguage={currentLanguage}
                sourceSections={getSourceSections()}
                translations={translations}
                onTranslationUpdate={handleTranslationUpdate}
                onMarkTranslated={handleMarkTranslated}
                markingSection={markingSection}
              />
            </div>
            <div className="lg:hidden">
              <TranslationEditorMobile
                manualId={manual.id}
                sourceLanguage={primaryLanguage}
                targetLanguage={currentLanguage}
                sourceSections={getSourceSections()}
                translations={translations}
                onTranslationUpdate={handleTranslationUpdate}
                onMarkTranslated={handleMarkTranslated}
                markingSection={markingSection}
              />
            </div>
          </>
        ) : (
          <>
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

            {/* Chapters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Chapters</h2>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={addInstruction}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Chapter
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
                      Add Warning
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
          </>
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
              <a href="#" className="hover:text-foreground">Chapters</a>
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

      <VersionHistoryPanel
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        manualId={manual.id}
        onRollbackComplete={async () => {
          const res = await fetch(`/api/manuals/${manual.id}`);
          if (res.ok) {
            const data = await res.json();
            setProductName(data.manual.productName);
            setOverview(data.manual.overview);
            setInstructions(Array.isArray(data.manual.instructions) ? data.manual.instructions : []);
            setWarnings(Array.isArray(data.manual.warnings) ? data.manual.warnings : []);
          }
        }}
      />

      <PublishWarningDialog
        open={publishWarningOpen}
        onOpenChange={setPublishWarningOpen}
        incompleteLanguages={incompleteLanguages}
        onPublishAnyway={doPublish}
      />

      <ChangePrimaryLanguageDialog
        open={changePrimaryOpen}
        onOpenChange={setChangePrimaryOpen}
        manualId={manual.id}
        currentPrimaryLanguage={primaryLanguage}
        onChanged={(code) => {
          setPrimaryLanguage(code);
          setCurrentLanguage(code);
          refreshLanguages();
        }}
      />
    </div>
  );
}
