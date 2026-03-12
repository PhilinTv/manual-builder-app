import { t } from "./i18n";

interface TocEntry {
  title: string;
  level: number;
  id: string;
}

export function generateTocEntries(
  instructions: Array<{ id: string; title: string; order: number }>,
  warnings: Array<{ id: string; severity: string }>,
  hasOverview: boolean,
  language: string
): TocEntry[] {
  const entries: TocEntry[] = [];

  if (hasOverview) {
    entries.push({ title: t(language, "overview"), level: 1, id: "overview" });
  }

  if (warnings.length > 0) {
    entries.push({ title: t(language, "safetyWarnings"), level: 1, id: "warnings" });
  }

  const sorted = [...instructions].sort((a, b) => a.order - b.order);
  for (let i = 0; i < sorted.length; i++) {
    entries.push({
      title: `${i + 1}. ${sorted[i].title}`,
      level: 1,
      id: `instruction-${sorted[i].id}`,
    });
  }

  return entries;
}

export function renderTocHtml(entries: TocEntry[], language: string): string {
  const items = entries
    .map(
      (e) =>
        `<div style="margin-left: ${(e.level - 1) * 20}px; margin-bottom: 6px;">
          <a href="#${e.id}" style="text-decoration: none; color: inherit;">${e.title}</a>
        </div>`
    )
    .join("\n");

  return `<div class="toc" style="page-break-after: always;"><h2>${t(language, "tableOfContents")}</h2>${items}</div>`;
}
