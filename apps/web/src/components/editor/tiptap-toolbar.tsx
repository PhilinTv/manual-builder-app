"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TiptapToolbarProps {
  editor: Editor | null;
}

export function TiptapToolbar({ editor }: TiptapToolbarProps) {
  if (!editor) return null;

  const items = [
    { action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive("bold"), icon: Bold, label: "Bold" },
    { action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive("italic"), icon: Italic, label: "Italic" },
    { action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive("underline"), icon: Underline, label: "Underline" },
    { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive("heading", { level: 2 }), icon: Heading2, label: "H2" },
    { action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive("heading", { level: 3 }), icon: Heading3, label: "H3" },
    { action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), isActive: editor.isActive("heading", { level: 4 }), icon: Heading4, label: "H4" },
    { action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive("bulletList"), icon: List, label: "Bullet List" },
    { action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive("orderedList"), icon: ListOrdered, label: "Ordered List" },
    { action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive("blockquote"), icon: Quote, label: "Blockquote" },
    {
      action: () => {
        const url = window.prompt("URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
      isActive: editor.isActive("link"),
      icon: Link,
      label: "Link",
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b p-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", item.isActive && "bg-accent")}
            onClick={item.action}
            aria-label={item.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
