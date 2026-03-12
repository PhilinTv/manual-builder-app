"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileDrawer } from "@/components/mobile-drawer";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}

export function AppShell({ children, userName, userRole }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar userName={userName} userRole={userRole} />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        userName={userName}
        userRole={userRole}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
