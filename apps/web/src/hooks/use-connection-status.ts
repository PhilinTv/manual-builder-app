"use client";

import { useState, useEffect, useRef } from "react";
import {
  createConnectionStatusTracker,
  type ConnectionStatus,
} from "@/lib/events/connection-status";

export function useConnectionStatus(sseStatus: ConnectionStatus): {
  showIndicator: boolean;
} {
  const [showIndicator, setShowIndicator] = useState(false);
  const trackerRef = useRef(createConnectionStatusTracker());

  useEffect(() => {
    const tracker = trackerRef.current;
    const unsubscribe = tracker.subscribe((show) => setShowIndicator(show));
    return () => {
      unsubscribe();
      tracker.destroy();
    };
  }, []);

  useEffect(() => {
    trackerRef.current.update(sseStatus);
    if (sseStatus !== "disconnected") {
      setShowIndicator(false);
    }
  }, [sseStatus]);

  return { showIndicator };
}
