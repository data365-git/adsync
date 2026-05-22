"use client";

import { ChevronRight, Home } from "lucide-react";
import { api } from "~/trpc/react";

type Crumb = { id: string; name: string };

type Props = {
  folderId: string | null;
  onNavigate: (id: string | null) => void;
  /** On mobile, collapse to last crumb + dropdown */
  mobile?: boolean;
};

/**
 * Renders Home / Folder A / Folder B / Current
 * Truncates middle crumbs with … when path > 5 segments.
 */
export function FolderBreadcrumb({ folderId, onNavigate }: Props) {
  const breadcrumbQuery = api.folders.breadcrumb.useQuery(
    { id: folderId! },
    { enabled: folderId !== null },
  );

  const crumbs: Crumb[] = breadcrumbQuery.data ?? [];

  // Truncate middle crumbs when path > 5 segments
  const truncatedCrumbs = buildVisibleCrumbs(crumbs);

  return (
    <nav
      aria-label="Folder navigation"
      className="flex items-center gap-1 text-sm text-slate-500"
    >
      {/* Home crumb */}
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 rounded px-1 py-0.5 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
        aria-label="Go to root scenarios"
      >
        <Home className="size-3.5" aria-hidden />
        <span>Home</span>
      </button>

      {folderId !== null && truncatedCrumbs.map((item, index) => {
        const isLast = index === truncatedCrumbs.length - 1;
        const isEllipsis = item.id === "__ellipsis__";

        return (
          <span key={item.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-slate-400" aria-hidden />
            {isEllipsis ? (
              <span className="text-slate-400">…</span>
            ) : isLast ? (
              <span className="font-medium text-slate-900">{item.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="rounded px-1 py-0.5 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
              >
                {item.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function buildVisibleCrumbs(
  crumbs: Crumb[],
): Array<{ id: string; name: string }> {
  if (crumbs.length <= 5) return crumbs;

  // Show first 1, ellipsis, last 3
  return [
    crumbs[0]!,
    { id: "__ellipsis__", name: "…" },
    ...crumbs.slice(-3),
  ];
}
