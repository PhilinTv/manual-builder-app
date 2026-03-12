import DiffMatchPatch from "diff-match-patch";

interface ManualSnapshot {
  productName: string;
  overview: any;
  instructions: any[];
  warnings: any[];
}

const dmp = new DiffMatchPatch();

function textFromJson(json: any): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  return JSON.stringify(json);
}

export function generateChangeSummary(
  prev: ManualSnapshot,
  curr: ManualSnapshot
): string {
  const changes: string[] = [];

  // Compare product name
  if (prev.productName !== curr.productName) {
    changes.push("Updated product name");
  }

  // Compare overview
  const prevOverview = textFromJson(prev.overview);
  const currOverview = textFromJson(curr.overview);
  if (prevOverview !== currOverview) {
    changes.push("Updated product overview");
  }

  // Compare instructions
  const prevInstructions = prev.instructions || [];
  const currInstructions = curr.instructions || [];
  const addedInstructions = currInstructions.length - prevInstructions.length;
  if (addedInstructions > 0) {
    changes.push(`Added ${addedInstructions} chapter${addedInstructions > 1 ? "s" : ""}`);
  } else if (addedInstructions < 0) {
    changes.push(`Removed ${Math.abs(addedInstructions)} chapter${Math.abs(addedInstructions) > 1 ? "s" : ""}`);
  } else if (textFromJson(prevInstructions) !== textFromJson(currInstructions)) {
    changes.push("Updated chapters");
  }

  // Compare warnings
  const prevWarnings = prev.warnings || [];
  const currWarnings = curr.warnings || [];
  const addedWarnings = currWarnings.length - prevWarnings.length;
  if (addedWarnings > 0) {
    changes.push(`Added ${addedWarnings} warning${addedWarnings > 1 ? "s" : ""}`);
  } else if (addedWarnings < 0) {
    changes.push(`Removed ${Math.abs(addedWarnings)} warning${Math.abs(addedWarnings) > 1 ? "s" : ""}`);
  } else if (textFromJson(prevWarnings) !== textFromJson(currWarnings)) {
    changes.push("Updated warnings");
  }

  return changes.length > 0 ? changes.join(", ") : "No changes";
}

export function generateTextDiff(
  oldText: string,
  newText: string
): { text: string; type: -1 | 0 | 1 }[] {
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([type, text]) => ({ text, type: type as -1 | 0 | 1 }));
}
