export interface DetectedWarning {
  keyword: string;
  severity: "DANGER" | "WARNING" | "CAUTION";
  text: string;
  confidence: number;
}

const KW_NAMES = ["Warning", "Caution", "Danger", "Attention"];
const KW_PATTERN = KW_NAMES.join("|");

/**
 * Detects safety warnings/cautions in extracted PDF text.
 *
 * Handles two patterns found in product manuals:
 *   1. Multi-line: `:Warning\n<title>!\n<description>`  or  `Caution!\n<description>`
 *   2. Inline: `WARNING: Do not submerge. DANGER: High voltage.`
 */
export function detectDangerWarnings(text: string): DetectedWarning[] {
  const warnings: DetectedWarning[] = [];
  const lines = text.split("\n").map((l) => l.trim());
  const consumed = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;
    const line = lines[i];
    if (!line) continue;

    // Pattern 1: keyword alone on its own line — `:Warning` or `Caution!`
    const kwOnlyMatch = line.match(
      new RegExp(`^:?\\s*(${KW_PATTERN})\\s*!?\\s*$`, "i")
    );
    if (kwOnlyMatch) {
      const keyword = kwOnlyMatch[1].toUpperCase();
      consumed.add(i);
      const body = collectBody(lines, i + 1, consumed);
      if (body) {
        warnings.push({
          keyword,
          severity: mapSeverity(keyword),
          text: body,
          confidence: 0.9,
        });
      }
      continue;
    }

    // Pattern 2: one or more inline keywords on the same line
    // e.g. "WARNING: Do not submerge. DANGER: High voltage."
    // e.g. "Caution! Damage to the appliance"
    const inlineRe = new RegExp(
      `(?:^|(?<=\\s)):?\\s*(${KW_PATTERN})\\s*[!:]\\s*`,
      "gi"
    );
    const inlineMatches: { keyword: string; textStart: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = inlineRe.exec(line)) !== null) {
      inlineMatches.push({
        keyword: m[1].toUpperCase(),
        textStart: m.index + m[0].length,
      });
    }

    if (inlineMatches.length > 0) {
      consumed.add(i);
      for (let k = 0; k < inlineMatches.length; k++) {
        const { keyword, textStart } = inlineMatches[k];
        const textEnd =
          k < inlineMatches.length - 1
            ? line.lastIndexOf(inlineMatches[k + 1].keyword.charAt(0), inlineMatches[k + 1].textStart)
            : line.length;

        // Extract inline text up to the next keyword (or end of line)
        const nextMatchStart =
          k < inlineMatches.length - 1
            ? findKeywordStart(line, inlineMatches[k + 1].textStart, inlineMatches[k + 1].keyword)
            : line.length;
        let inlineText = line.slice(textStart, nextMatchStart).trim();
        // Remove trailing punctuation-only leftovers
        inlineText = inlineText.replace(/\s+$/, "");

        // For the last keyword on the line, also collect continuation lines
        const extraBody =
          k === inlineMatches.length - 1
            ? collectBody(lines, i + 1, consumed)
            : "";

        const fullText = (inlineText + (extraBody ? " " + extraBody : "")).trim();

        if (fullText) {
          warnings.push({
            keyword,
            severity: mapSeverity(keyword),
            text: fullText,
            confidence: 0.9,
          });
        }
      }
    }
  }

  return warnings;
}

/** Find the start index of the keyword match area (the `:?keyword` portion) */
function findKeywordStart(
  line: string,
  textStartOfNext: number,
  _keyword: string
): number {
  // Walk backwards from the text start to find where the keyword pattern begins
  const prefix = line.slice(0, textStartOfNext);
  const kwMatch = prefix.match(
    new RegExp(`(?:^|\\s):?\\s*(${KW_PATTERN})\\s*[!:]\\s*$`, "i")
  );
  if (kwMatch) {
    return textStartOfNext - kwMatch[0].length;
  }
  return textStartOfNext;
}

function mapSeverity(
  keyword: string
): "DANGER" | "WARNING" | "CAUTION" {
  switch (keyword) {
    case "DANGER":
      return "DANGER";
    case "WARNING":
      return "WARNING";
    case "CAUTION":
    case "ATTENTION":
      return "CAUTION";
    default:
      return "WARNING";
  }
}

/**
 * Collect lines following a warning keyword until we hit another keyword,
 * an empty line, or we've gathered enough context (~2 sentences).
 */
function collectBody(
  lines: string[],
  start: number,
  consumed: Set<number>
): string {
  const parts: string[] = [];
  let sentenceEnds = 0;

  for (let j = start; j < lines.length; j++) {
    const l = lines[j];

    if (!l) break;

    // Stop if we hit another warning/caution keyword line
    if (new RegExp(`^:?\\s*(${KW_PATTERN})\\s*[!:]?\\s*$`, "i").test(l)) break;
    if (new RegExp(`^:?\\s*(${KW_PATTERN})\\s*[!:]\\s*.+`, "i").test(l)) break;

    // Stop at section headers
    if (/^[A-Z][a-z]+[A-Z]/.test(l)) break;
    if (/^Note\/tip/i.test(l)) break;

    consumed.add(j);
    parts.push(l);

    if (/[.!?]$/.test(l)) sentenceEnds++;
    if (sentenceEnds >= 2) break;
  }

  return parts.join(" ");
}
