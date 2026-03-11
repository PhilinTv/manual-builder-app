"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionIndicator } from "@/components/notifications/connection-indicator";
import { useNotifications } from "@/components/notifications/notification-provider";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { showIndicator } = useNotifications();

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="lg:hidden">
        <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="ml-auto">
        <ConnectionIndicator showIndicator={showIndicator} />
      </div>
    </header>
  );
}
