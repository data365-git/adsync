"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Plug,
  Settings,
  Wallet,
} from "lucide-react";

import { cn } from "~/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/ad-accounts", label: "Ad Accounts", icon: Wallet },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary navigation"
      className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-screen w-60 shrink-0 flex-col border-r md:flex"
    >
      <Link
        href="/connections"
        className="flex h-16 items-center gap-2 px-6 font-semibold tracking-tight"
      >
        <LayoutDashboard className="h-5 w-5" aria-hidden />
        <span>Automation</span>
      </Link>
      <nav className="flex-1 px-3">
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
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
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
      <div className="text-muted-foreground px-6 py-4 text-xs">
        Phase 1 · Mock data
      </div>
    </aside>
  );
}
