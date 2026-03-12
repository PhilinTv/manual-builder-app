"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userRole: string;
}

export function MobileDrawer({ open, onOpenChange, userName, userRole }: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Sidebar
          userName={userName}
          userRole={userRole}
          onLinkClick={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
