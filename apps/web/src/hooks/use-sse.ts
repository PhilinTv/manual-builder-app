"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEClientEvent } from "@/lib/events/event-bus";

type SSEStatus = "connected" | "connecting" | "disconnected";

export function useSSE(onEvent: (event: SSEClientEvent) => void): {
  status: SSEStatus;
} {
  const [status, setStatus] = useState<SSEStatus>("connecting");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      setStatus("connecting");
      eventSource = new EventSource("/api/events");

      eventSource.onopen = () => {
        retryCount = 0;
        setStatus("connected");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEClientEvent;
          onEventRef.current(data);
        } catch {
          // Ignore malformed data
        }
      };

      eventSource.onerror = () => {
        setStatus("disconnected");
        eventSource?.close();
        eventSource = null;

        if (!destroyed) {
          // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
          const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          retryTimeout = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      eventSource?.close();
      eventSource = null;
    };
  }, []);

  return { status };
}
