"use client";

import { createContext, useContext, useCallback, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSSE } from "@/hooks/use-sse";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { ConnectionIndicator } from "@/components/notifications/connection-indicator";
import type { SSEClientEvent } from "@/lib/events/event-bus";

interface NotificationContextValue {
  showIndicator: boolean;
  staleBanner: { visible: boolean; updatedBy: string; manualId: string } | null;
  clearStaleBanner: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  showIndicator: false,
  staleBanner: null,
  clearStaleBanner: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staleBanner, setStaleBanner] = useState<{
    visible: boolean;
    updatedBy: string;
    manualId: string;
  } | null>(null);

  // Get current manual ID from URL if viewing one
  const manualIdMatch = pathname.match(/^\/manuals\/([^/]+)/);
  const currentManualId = manualIdMatch ? manualIdMatch[1] : null;

  // Clear stale banner on navigation
  useEffect(() => {
    if (staleBanner && staleBanner.manualId !== currentManualId) {
      setStaleBanner(null);
    }
  }, [pathname, currentManualId, staleBanner]);

  const handleEvent = useCallback(
    (event: SSEClientEvent) => {
      switch (event.type) {
        case "manual:published": {
          if (currentManualId === event.manualId) {
            // User is viewing this manual - contextual toast + stale banner
            toast("This manual was just updated by " + event.actorName, {
              description: "Click to reload with latest changes",
              action: {
                label: "Reload",
                onClick: () => {
                  router.refresh();
                  setStaleBanner(null);
                },
              },
              duration: 5000,
            });
            setStaleBanner({
              visible: true,
              updatedBy: event.actorName,
              manualId: event.manualId,
            });
          } else {
            // User is on a different page
            toast(event.actorName + " published " + event.manualTitle, {
              action: {
                label: "View",
                onClick: () => router.push(`/manuals/${event.manualId}`),
              },
              duration: 5000,
            });
          }
          break;
        }
        case "manual:assigned": {
          toast("You were assigned to " + event.manualTitle, {
            action: {
              label: "View",
              onClick: () => router.push(`/manuals/${event.manualId}`),
            },
            duration: 5000,
          });
          break;
        }
        case "manual:unassigned": {
          toast("You were unassigned from " + event.manualTitle, {
            duration: 5000,
          });
          break;
        }
      }
    },
    [currentManualId, router]
  );

  const { status } = useSSE(handleEvent);
  const { showIndicator } = useConnectionStatus(status);

  const clearStaleBanner = useCallback(() => {
    setStaleBanner(null);
    router.refresh();
  }, [router]);

  return (
    <NotificationContext.Provider
      value={{ showIndicator, staleBanner, clearStaleBanner }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
