import { describe, it, expect } from "vitest";
import { markdownToTiptap } from "@/services/import/markdown-to-tiptap";

describe("markdownToTiptap", () => {
  it("converts plain paragraph text", () => {
    const result = markdownToTiptap("Hello world");
    expect(result.type).toBe("doc");
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe("paragraph");
    expect(result.content![0].content![0].text).toBe("Hello world");
  });

  it("converts multiple paragraphs separated by blank lines", () => {
    const result = markdownToTiptap("First paragraph.\n\nSecond paragraph.");
    expect(result.content).toHaveLength(2);
    expect(result.content![0].type).toBe("paragraph");
    expect(result.content![1].type).toBe("paragraph");
  });

  it("converts **bold** inline", () => {
    const result = markdownToTiptap("Use **caution** here");
    const para = result.content![0];
    expect(para.content).toHaveLength(3);
    expect(para.content![1].text).toBe("caution");
    expect(para.content![1].marks).toEqual([{ type: "bold" }]);
  });

  it("converts *italic* inline", () => {
    const result = markdownToTiptap("This is *important*");
    const para = result.content![0];
    const italic = para.content!.find((c: any) => c.marks?.[0]?.type === "italic");
    expect(italic).toBeDefined();
    expect(italic!.text).toBe("important");
  });

  it("converts headings (##, ###, ####)", () => {
    const result = markdownToTiptap("## Section Title\n\nSome text\n\n### Subsection");
    expect(result.content![0].type).toBe("heading");
    expect(result.content![0].attrs!.level).toBe(2);
    expect(result.content![1].type).toBe("paragraph");
    expect(result.content![2].type).toBe("heading");
    expect(result.content![2].attrs!.level).toBe(3);
  });

  it("converts ordered lists", () => {
    const result = markdownToTiptap("1. First step\n2. Second step\n3. Third step");
    expect(result.content).toHaveLength(1);
    const list = result.content![0];
    expect(list.type).toBe("orderedList");
    expect(list.content).toHaveLength(3);
    expect(list.content![0].type).toBe("listItem");
    expect(list.content![0].content![0].content![0].text).toBe("First step");
  });

  it("converts bullet lists", () => {
    const result = markdownToTiptap("- Item A\n- Item B");
    const list = result.content![0];
    expect(list.type).toBe("bulletList");
    expect(list.content).toHaveLength(2);
  });

  it("converts blockquotes", () => {
    const result = markdownToTiptap("> Important note here");
    expect(result.content![0].type).toBe("blockquote");
  });

  it("converts horizontal rules", () => {
    const result = markdownToTiptap("Above\n\n---\n\nBelow");
    expect(result.content![1].type).toBe("horizontalRule");
  });

  it("converts code blocks", () => {
    const result = markdownToTiptap("```\nconst x = 1;\n```");
    expect(result.content![0].type).toBe("codeBlock");
    expect(result.content![0].content![0].text).toBe("const x = 1;");
  });

  it("converts inline `code`", () => {
    const result = markdownToTiptap("Press `Enter` to continue");
    const para = result.content![0];
    const code = para.content!.find((c: any) => c.marks?.[0]?.type === "code");
    expect(code).toBeDefined();
    expect(code!.text).toBe("Enter");
  });

  it("converts [links](url)", () => {
    const result = markdownToTiptap("Visit [our site](https://example.com)");
    const para = result.content![0];
    const link = para.content!.find((c: any) => c.marks?.[0]?.type === "link");
    expect(link).toBeDefined();
    expect(link!.text).toBe("our site");
    expect(link!.marks![0].attrs!.href).toBe("https://example.com");
  });

  it("handles empty string gracefully", () => {
    const result = markdownToTiptap("");
    expect(result.type).toBe("doc");
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe("paragraph");
  });

  it("handles complex mixed content", () => {
    const md = `## Safety Instructions

Always wear **protective gear** when operating.

1. Turn off the machine
2. Disconnect power
3. Wait 5 minutes

- Gloves required
- Eye protection recommended

> Never operate without supervision`;

    const result = markdownToTiptap(md);
    const types = result.content!.map((n: any) => n.type);

    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("orderedList");
    expect(types).toContain("bulletList");
    expect(types).toContain("blockquote");
  });
});
