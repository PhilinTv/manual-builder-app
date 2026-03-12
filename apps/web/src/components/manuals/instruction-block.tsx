"use client";

import { type JSONContent } from "@tiptap/react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

interface InstructionBlockProps {
  index: number;
  title: string;
  body: JSONContent | null;
  onChange: (data: { title?: string; body?: JSONContent }) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  editable: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export function InstructionBlock({
  index,
  title,
  body,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  editable,
  isFirst,
  isLast,
}: InstructionBlockProps) {
  return (
    <div data-testid="instruction-block" className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Chapter {index + 1}
        </span>
        {editable && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <Input
        data-testid="instruction-title"
        placeholder="Chapter title"
        value={title}
        onChange={(e) => onChange({ title: e.target.value })}
        disabled={!editable}
      />
      <TiptapEditor
        content={body}
        onChange={(json) => onChange({ body: json })}
        editable={editable}
        placeholder="Describe this chapter..."
      />
    </div>
  );
}
