"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TiptapToolbar } from "./tiptap-toolbar";

interface TiptapEditorProps {
  content: JSONContent | null;
  onChange: (json: JSONContent) => void;
  editable: boolean;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  editable,
  placeholder,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content: content || undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  return (
    <div className="rounded-md border">
      {editable && <TiptapToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none [&_.tiptap]:min-h-[100px] [&_.tiptap]:focus:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
