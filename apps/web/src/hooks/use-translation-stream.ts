"use client";

import { useState, useRef, useCallback } from "react";

interface UseTranslationStreamReturn {
  translateSection: (manualId: string, section: string, targetLanguage: string) => void;
  translateAll: (manualId: string, targetLanguage: string) => void;
  streaming: boolean;
  currentSection: string | null;
  error: string | null;
  sectionErrors: Record<string, string>;
  cancel: () => void;
  onChunk?: (section: string, text: string) => void;
  onSectionComplete?: (section: string) => void;
  onAllComplete?: (translated: number, failed: number) => void;
}

export function useTranslationStream(callbacks?: {
  onChunk?: (section: string, text: string) => void;
  onSectionComplete?: (section: string) => void;
  onAllComplete?: (translated: number, failed: number) => void;
  onError?: (section: string, error: string) => void;
}): UseTranslationStreamReturn {
  const [streaming, setStreaming] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setCurrentSection(null);
  }, []);

  const translateSection = useCallback(
    async (manualId: string, section: string, targetLanguage: string) => {
      setStreaming(true);
      setCurrentSection(section);
      setError(null);

      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/manuals/${manualId}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, targetLanguage }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setError("Translation request failed");
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  callbacks?.onChunk?.(section, data.text);
                }
                if (data.done) {
                  callbacks?.onSectionComplete?.(section);
                }
                if (data.error) {
                  setError(data.error);
                  callbacks?.onError?.(section, data.error);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setStreaming(false);
        setCurrentSection(null);
      }
    },
    [callbacks]
  );

  const translateAll = useCallback(
    async (manualId: string, targetLanguage: string) => {
      setStreaming(true);
      setError(null);
      setSectionErrors({});

      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/manuals/${manualId}/translate/all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLanguage }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setError("Translation request failed");
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.status === "start") {
                  setCurrentSection(data.sectionId);
                }
                if (data.status === "chunk" && data.text) {
                  callbacks?.onChunk?.(data.sectionId, data.text);
                }
                if (data.status === "done") {
                  callbacks?.onSectionComplete?.(data.sectionId);
                }
                if (data.status === "error") {
                  setSectionErrors((prev) => ({
                    ...prev,
                    [data.sectionId]: data.error,
                  }));
                  callbacks?.onError?.(data.sectionId, data.error);
                }
                if (data.done === true) {
                  callbacks?.onAllComplete?.(data.translated, data.failed);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setStreaming(false);
        setCurrentSection(null);
      }
    },
    [callbacks]
  );

  return {
    translateSection,
    translateAll,
    streaming,
    currentSection,
    error,
    sectionErrors,
    cancel,
  };
}
