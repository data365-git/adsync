"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

const tabs = [
  ["Profile", "/settings/profile"],
  ["Workspace", "/settings/workspace"],
  ["Access", "/settings/access"],
  ["Tokens", "/settings/tokens"],
  ["Notifications", "/settings/notifications"],
  ["Schedules", "/settings/schedules"],
  ["Integrations", "/settings/integrations"],
  ["Danger", "/settings/danger"],
  ["About", "/settings/about"],
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="flex flex-col gap-1">
      {tabs.map(([label, href]) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "min-h-11 border-l-2 px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none",
              active
                ? "border-sky-700 bg-slate-100 font-medium text-slate-900"
                : "border-transparent text-slate-700 hover:bg-slate-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
