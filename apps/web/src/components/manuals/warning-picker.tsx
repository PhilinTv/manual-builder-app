"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Search } from "lucide-react";

type Severity = "DANGER" | "WARNING" | "CAUTION";

interface SearchResult {
  id: string;
  title: string;
  severity: Severity;
}

interface WarningPickerProps {
  manualId: string;
  linkedWarningIds: string[];
  onAdd: (warning: any) => void;
}

export function WarningPicker({ manualId, linkedWarningIds, onAdd }: WarningPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/warnings/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.warnings);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  async function handleSelect(warning: SearchResult) {
    const res = await fetch(`/api/manuals/${manualId}/warnings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dangerWarningId: warning.id }),
    });

    if (res.ok) {
      const data = await res.json();
      onAdd(data.manualWarning);
      setOpen(false);
      setQuery("");
    }
  }

  const filteredResults = results.filter(
    (r) => !linkedWarningIds.includes(r.id)
  );

  return (
    <div ref={containerRef} className="relative" data-testid="warning-picker">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search library warnings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            className="pl-9"
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {filteredResults.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No warnings found
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {filteredResults.map((warning) => (
                <li key={warning.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => handleSelect(warning)}
                  >
                    <SeverityBadge severity={warning.severity} />
                    <span>{warning.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
