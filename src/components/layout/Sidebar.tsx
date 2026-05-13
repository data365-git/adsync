"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Plug,
  Settings,
  Wallet,
  Workflow,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { ThemeToggle } from "~/components/providers/ThemeProvider";
import { UserMenu } from "~/components/layout/UserMenu";
import type { User } from "~/server/mocks/types";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/ad-accounts", label: "Ad Accounts", icon: Wallet },
  { href: "/scenarios", label: "Scenarios", icon: Workflow },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary navigation"
      className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r md:flex"
    >
      <Link
        href="/connections"
        className="flex h-16 items-center gap-2 px-6 text-base tracking-tight"
      >
        <LayoutDashboard className="h-5 w-5" aria-hidden />
        <span>adsync</span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-base transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-sidebar-border flex items-center justify-between gap-2 border-t px-3 py-3">
        <UserMenu user={user} />
        <div className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {user.email}
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
