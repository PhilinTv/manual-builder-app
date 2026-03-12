"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Check, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type JSONContent } from "@tiptap/react";

interface TranslationSection {
  section: string;
  content: any;
  status: "NOT_TRANSLATED" | "IN_PROGRESS" | "TRANSLATED";
  updatedAt: string;
}

interface SourceSection {
  section: string;
  label: string;
  content: any;
}

interface TranslationEditorMobileProps {
  manualId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceSections: SourceSection[];
  translations: TranslationSection[];
  onTranslationUpdate: (section: string, content: any, status?: string) => void;
  onMarkTranslated: (section: string, pendingContent?: any) => void;
  markingSection?: string | null;
}

function statusLabel(status: string) {
  switch (status) {
    case "NOT_TRANSLATED":
      return "Not translated";
    case "IN_PROGRESS":
      return "In progress";
    case "TRANSLATED":
      return "Translated";
    default:
      return status;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "NOT_TRANSLATED":
      return "bg-red-100 text-red-800";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800";
    case "TRANSLATED":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function renderSourceContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  // Warning objects: {title, description, severity}
  if (content.description) {
    return content.title
      ? `${content.title}: ${content.description}`
      : content.description;
  }
  if (content.title) return content.title;
  // Tiptap JSON nodes: {type, content: [...]}
  if (Array.isArray(content.content)) {
    return content.content
      .map((node: any) => {
        if (node.type === "text") return node.text || "";
        if (node.content) return renderSourceContent(node);
        return "";
      })
      .join("");
  }
  return JSON.stringify(content);
}

export function TranslationEditorMobile({
  manualId,
  sourceLanguage,
  targetLanguage,
  sourceSections,
  translations,
  onTranslationUpdate,
  onMarkTranslated,
  markingSection,
}: TranslationEditorMobileProps) {
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingContentRef = useRef<Record<string, any>>({});

  function getTranslation(section: string): TranslationSection | undefined {
    return translations.find((t) => t.section === section);
  }

  function handleContentChange(section: string, content: any) {
    pendingContentRef.current[section] = content;
    if (saveTimeoutRef.current[section]) {
      clearTimeout(saveTimeoutRef.current[section]);
    }
    saveTimeoutRef.current[section] = setTimeout(() => {
      delete pendingContentRef.current[section];
      onTranslationUpdate(section, content);
    }, 1000);
  }

  function handleMarkClick(section: string) {
    if (saveTimeoutRef.current[section]) {
      clearTimeout(saveTimeoutRef.current[section]);
      delete saveTimeoutRef.current[section];
    }
    const pendingContent = pendingContentRef.current[section];
    delete pendingContentRef.current[section];
    onMarkTranslated(section, pendingContent);
  }

  return (
    <div data-testid="translation-editor-mobile" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Translating to {targetLanguage.toUpperCase()}
        </h3>
        <Button
          data-testid="show-source-button"
          variant="outline"
          size="sm"
          onClick={() => setSourceSheetOpen(true)}
        >
          <Eye className="mr-1 h-4 w-4" />
          Show source
        </Button>
      </div>

      {sourceSections.map((s) => {
        const t = getTranslation(s.section);
        const status = t?.status || "NOT_TRANSLATED";

        return (
          <div key={s.section} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <span
                data-testid={`status-badge-${s.section}`}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  statusColor(status)
                )}
              >
                {statusLabel(status)}
              </span>
            </div>
            <div className="border rounded-md p-2">
              {s.section === "productName" ? (
                <Input
                  defaultValue={
                    typeof t?.content === "string"
                      ? t.content
                      : renderSourceContent(t?.content)
                  }
                  onChange={(e) => handleContentChange(s.section, e.target.value)}
                  placeholder="Translate product name..."
                />
              ) : s.section === "overview" ? (
                <TiptapEditor
                  content={t?.content as JSONContent}
                  onChange={(content) => handleContentChange(s.section, content)}
                  editable={true}
                  placeholder="Translate overview..."
                />
              ) : (
                <Input
                  defaultValue={renderSourceContent(t?.content)}
                  onChange={(e) => handleContentChange(s.section, e.target.value)}
                  placeholder="Translate..."
                />
              )}
            </div>
            {status !== "TRANSLATED" && (
              <Button
                data-testid={`mark-translated-${s.section}`}
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                disabled={markingSection === s.section}
                onClick={() => handleMarkClick(s.section)}
              >
                {markingSection === s.section ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3 w-3" />
                )}
                Mark as translated
              </Button>
            )}
          </div>
        );
      })}

      <Sheet open={sourceSheetOpen} onOpenChange={setSourceSheetOpen}>
        <SheetContent
          data-testid="source-bottom-sheet"
          side="bottom"
          className="max-h-[60vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Source ({sourceLanguage.toUpperCase()})</SheetTitle>
            <SheetDescription>
              Original content for reference
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {sourceSections.map((s) => (
              <div key={s.section} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <div className="text-sm border rounded-md p-2 bg-muted">
                  {renderSourceContent(s.content)}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
