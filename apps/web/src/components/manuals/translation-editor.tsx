"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Check, Loader2 } from "lucide-react";
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

interface TranslationEditorProps {
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

export function TranslationEditor({
  manualId,
  sourceLanguage,
  targetLanguage,
  sourceSections,
  translations,
  onTranslationUpdate,
  onMarkTranslated,
  markingSection,
}: TranslationEditorProps) {
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
    // Cancel any pending debounce for this section
    if (saveTimeoutRef.current[section]) {
      clearTimeout(saveTimeoutRef.current[section]);
      delete saveTimeoutRef.current[section];
    }
    // Grab pending content and clear it
    const pendingContent = pendingContentRef.current[section];
    delete pendingContentRef.current[section];
    onMarkTranslated(section, pendingContent);
  }

  return (
    <div data-testid="translation-editor-side-by-side" className="grid grid-cols-2 gap-4">
      {/* Source column */}
      <div data-testid="source-column" className="space-y-4 bg-muted/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Source ({sourceLanguage.toUpperCase()})
        </h3>
        {sourceSections.map((s) => (
          <div key={s.section} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <div
              className="text-sm border rounded-md p-2 bg-background"
              aria-readonly="true"
            >
              {s.section === "productName" ? (
                <p>{renderSourceContent(s.content)}</p>
              ) : s.section === "overview" ? (
                <TiptapEditor
                  content={s.content as JSONContent}
                  onChange={() => {}}
                  editable={false}
                />
              ) : (
                <p className="whitespace-pre-wrap">{renderSourceContent(s.content)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Target column */}
      <div data-testid="target-column" className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">
          Target ({targetLanguage.toUpperCase()})
        </h3>
        {sourceSections.map((s) => {
          const t = getTranslation(s.section);
          const status = t?.status || "NOT_TRANSLATED";

          return (
            <div key={s.section} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span
                    data-testid={`status-badge-${s.section}`}
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      statusColor(status)
                    )}
                  >
                    {statusLabel(status)}
                  </span>
                  {status !== "TRANSLATED" && (
                    <Button
                      data-testid={`mark-translated-${s.section}`}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
