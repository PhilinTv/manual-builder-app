"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, BookOpen, Users, LogOut, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  userName: string;
  userRole: string;
  className?: string;
  onLinkClick?: () => void;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/manuals", label: "Manuals", icon: BookOpen },
];

const adminItems = [
  { href: "/warnings", label: "Warnings", icon: AlertTriangle },
  { href: "/admin/users", label: "User Management", icon: Users },
];

export function Sidebar({ userName, userRole, className, onLinkClick }: SidebarProps) {
  const pathname = usePathname();

  const items = userRole === "ADMIN" ? [...navItems, ...adminItems] : navItems;

  return (
    <nav className={cn("sidebar flex h-full w-64 flex-col border-r bg-card", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="font-semibold" onClick={onLinkClick}>
          Manuals Builder
        </Link>
      </div>
      <div className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t p-4">
        <div className="mb-2">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
