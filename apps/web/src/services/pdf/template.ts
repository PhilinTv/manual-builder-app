import { getWarningIcon } from "./warning-icons";
import { generateTocEntries, renderTocHtml } from "./toc";
import { t } from "./i18n";

interface ManualWarning {
  id: string;
  title: string;
  description: string;
  severity: string;
  order: number;
}

interface ManualInstruction {
  id: string;
  title: string;
  body: any;
  order: number;
}

interface ManualData {
  productName: string;
  overview: any;
  instructions: ManualInstruction[];
  warnings: ManualWarning[];
}

function tiptapJsonToHtml(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return escapeHtml(node);

  if (node.type === "text") {
    let text = escapeHtml(node.text || "");
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        if (mark.type === "italic") text = `<em>${text}</em>`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "strike") text = `<s>${text}</s>`;
        if (mark.type === "code") text = `<code>${text}</code>`;
      }
    }
    return text;
  }

  const children = (Array.isArray(node.content) ? node.content : []).map(tiptapJsonToHtml).join("");

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = node.attrs?.level || 3;
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${children}</code></pre>`;
    case "hardBreak":
      return "<br/>";
    default:
      return children;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderWarnings(warnings: ManualWarning[], language: string): string {
  if (!warnings || warnings.length === 0) return "";

  const sorted = [...warnings].sort((a, b) => a.order - b.order);

  const items = sorted
    .map((w) => {
      const icon = getWarningIcon(w.severity);
      const borderColor =
        w.severity === "DANGER"
          ? "#dc2626"
          : w.severity === "WARNING"
            ? "#ea580c"
            : "#ca8a04";
      const bgColor =
        w.severity === "DANGER"
          ? "#fef2f2"
          : w.severity === "WARNING"
            ? "#fff7ed"
            : "#fefce8";

      return `
      <div style="border: 2px solid ${borderColor}; background: ${bgColor}; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          ${icon}
          <span style="font-weight: bold; font-size: 14px; color: ${borderColor}; text-transform: uppercase;">${w.severity}</span>
        </div>
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${escapeHtml(w.title)}</div>
        <div style="font-size: 14px; color: #374151;">${escapeHtml(w.description)}</div>
      </div>`;
    })
    .join("\n");

  return `
    <div id="warnings" class="warnings-section" style="page-break-before: always;">
      <h2>${escapeHtml(t(language, "safetyWarnings"))}</h2>
      ${items}
    </div>`;
}

function renderInstructions(instructions: ManualInstruction[]): string {
  if (!instructions || instructions.length === 0) return "";

  const sorted = [...instructions].sort((a, b) => a.order - b.order);

  const items = sorted
    .map((inst, idx) => {
      const bodyHtml = tiptapJsonToHtml(inst.body);
      return `
      <div id="instruction-${inst.id}" class="instruction-section"${idx === 0 ? ' style="page-break-before: always;"' : ""}>
        <h2>${idx + 1}. ${escapeHtml(inst.title)}</h2>
        <div class="instruction-body">${bodyHtml}</div>
      </div>`;
    })
    .join("\n");

  return items;
}

export function renderManualToHtml(manual: ManualData, language: string): string {
  const overviewHtml = tiptapJsonToHtml(manual.overview);
  const warningsHtml = renderWarnings(manual.warnings, language);
  const instructionsHtml = renderInstructions(manual.instructions);
  const tocEntries = generateTocEntries(
    manual.instructions,
    manual.warnings,
    !!manual.overview,
    language
  );
  const tocHtml = renderTocHtml(tocEntries, language);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(manual.productName)} - ${escapeHtml(t(language, "manual"))}</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 30mm 20mm;
      @bottom-center {
        content: counter(page) " / " counter(pages);
        font-size: 10px;
        color: #6b7280;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #111827;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #111827;
    }

    h2 {
      font-size: 20px;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
    }

    h3 {
      font-size: 16px;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin: 0 0 10px 0;
    }

    ul, ol {
      margin: 0 0 10px 0;
      padding-left: 24px;
    }

    blockquote {
      border-left: 3px solid #d1d5db;
      padding-left: 12px;
      margin: 0 0 10px 0;
      color: #6b7280;
    }

    pre {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 13px;
    }

    code {
      background: #f3f4f6;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 13px;
    }

    pre code {
      background: none;
      padding: 0;
    }

    .cover-page {
      text-align: center;
      padding-top: 200px;
    }

    .cover-page .subtitle {
      font-size: 16px;
      color: #6b7280;
      margin-top: 8px;
    }

    .overview-section {
      page-break-before: always;
    }

    .instruction-body {
      margin-left: 8px;
    }

    .toc {
      page-break-after: always;
    }

    .toc a {
      text-decoration: none;
      color: inherit;
    }

    .toc a:hover {
      text-decoration: underline;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }

    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background: #f3f4f6;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>${escapeHtml(manual.productName)}</h1>
    <div class="subtitle">${escapeHtml(t(language, "productManual"))}</div>
    <div class="subtitle">${language.toUpperCase()}</div>
  </div>

  ${tocHtml}

  <div id="overview" class="overview-section">
    <h2>${escapeHtml(t(language, "overview"))}</h2>
    ${overviewHtml}
  </div>

  ${warningsHtml}

  ${instructionsHtml}
</body>
</html>`;
}
