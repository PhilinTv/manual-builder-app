import type { JSONContent } from "@tiptap/react";

/**
 * Convert a markdown string to TipTap JSONContent (StarterKit schema).
 * Handles: paragraphs, headings (##, ###, ####), bold, italic,
 * ordered lists, bullet lists, blockquotes, horizontal rules, code blocks.
 */
export function markdownToTiptap(md: string): JSONContent {
  const lines = md.split("\n");
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$|^\*\*\*+$|^___+$/.test(line.trim())) {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Heading: ## / ### / ####
    const headingMatch = line.match(/^(#{2,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 2 | 3 | 4;
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInline(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // Code block (``` fenced)
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      content.push({
        type: "codeBlock",
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      continue;
    }

    // Blockquote (> ...)
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      content.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: parseInline(quoteLines.join(" ")),
          },
        ],
      });
      continue;
    }

    // Ordered list (1. / 2. / ...)
    if (/^\d+\.\s/.test(line.trimStart())) {
      const items: JSONContent[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        const text = lines[i].replace(/^\s*\d+\.\s+/, "");
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(text) }],
        });
        i++;
        // Consume continuation lines (indented, non-list)
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          !/^\d+\.\s/.test(lines[i].trimStart()) &&
          !/^[-*+]\s/.test(lines[i].trimStart()) &&
          !/^#{2,4}\s/.test(lines[i])
        ) {
          // Append to last item
          const lastItem = items[items.length - 1];
          const lastParagraph = lastItem.content![lastItem.content!.length - 1];
          const contText = lines[i].trim();
          lastParagraph.content = [
            ...(lastParagraph.content || []),
            { type: "text", text: " " + contText },
          ];
          i++;
        }
      }
      content.push({ type: "orderedList", attrs: { start: 1 }, content: items });
      continue;
    }

    // Bullet list (- / * / +)
    if (/^[-*+]\s/.test(line.trimStart())) {
      const items: JSONContent[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trimStart())) {
        const text = lines[i].replace(/^\s*[-*+]\s+/, "");
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(text) }],
        });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{2,4}\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i].trimStart()) &&
      !/^[-*+]\s/.test(lines[i].trimStart()) &&
      !lines[i].trim().startsWith("> ") &&
      !lines[i].trim().startsWith("```") &&
      !/^---+$|^\*\*\*+$|^___+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const text = paraLines.join(" ");
      content.push({
        type: "paragraph",
        content: parseInline(text),
      });
    }
  }

  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

/**
 * Parse inline markdown: **bold**, *italic*, `code`, [text](url)
 */
function parseInline(text: string): JSONContent[] {
  const result: JSONContent[] = [];
  // Regex to match inline formatting tokens
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      result.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      // **bold**
      result.push({
        type: "text",
        text: match[2],
        marks: [{ type: "bold" }],
      });
    } else if (match[3]) {
      // *italic*
      result.push({
        type: "text",
        text: match[3],
        marks: [{ type: "italic" }],
      });
    } else if (match[4]) {
      // `code`
      result.push({
        type: "text",
        text: match[4],
        marks: [{ type: "code" }],
      });
    } else if (match[5] && match[6]) {
      // [text](url)
      result.push({
        type: "text",
        text: match[5],
        marks: [{ type: "link", attrs: { href: match[6], target: "_blank" } }],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push({ type: "text", text: text.slice(lastIndex) });
  }

  return result.length > 0 ? result : [{ type: "text", text: text || " " }];
}
