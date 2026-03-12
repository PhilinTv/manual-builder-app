"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileCheck } from "lucide-react";

export function ImportPendingBadge() {
  const router = useRouter();
  const [state, setState] = useState<{
    hasPending: boolean;
    importId: string | null;
    status: string | null;
  }>({ hasPending: false, importId: null, status: null });

  useEffect(() => {
    async function checkPending() {
      try {
        const res = await fetch("/api/imports/pending");
        if (res.ok) {
          const data = await res.json();
          setState(data);
        }
      } catch {
        // Silently fail - badge is non-critical
      }
    }

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!state.hasPending) return null;

  if (state.status === "READY_FOR_REVIEW" && state.importId) {
    return (
      <button
        data-testid="import-pending-badge"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/imports/${state.importId}/review`);
        }}
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 hover:bg-green-200 transition-colors"
      >
        <FileCheck className="h-3 w-3" />
        Review import
      </button>
    );
  }

  return (
    <span
      data-testid="import-pending-badge"
      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      Import in progress
    </span>
  );
}
