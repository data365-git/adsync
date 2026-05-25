"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FilePlus2,
  Folder,
  FolderPlus,
  History,
  LayoutList,
  Link2,
  PlayCircle,
  Settings,
  Zap,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { api } from "~/trpc/react";
import { usePalette } from "./CommandPaletteProvider";

const RECENT_KEY = "adsync.recent";

type RecentItem = {
  id: string;
  label: string;
  href: string;
  type: string;
  subtitle?: string;
};

const pages = [
  { label: "Connections", href: "/connections", icon: Link2 },
  { label: "Scenarios", href: "/scenarios", icon: Zap },
  { label: "Runs", href: "/runs", icon: PlayCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

function readRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentItem => {
      if (typeof item !== "object" || item === null) return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        typeof record.label === "string" &&
        typeof record.href === "string" &&
        typeof record.type === "string" &&
        (record.subtitle === undefined || typeof record.subtitle === "string")
      );
    });
  } catch {
    return [];
  }
}

function writeRecent(item: RecentItem) {
  const next = [item, ...readRecent().filter((recent) => recent.href !== item.href)]
    .slice(0, 20);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function CommandPalette() {
  const { open, setOpen } = usePalette();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (open) setRecent(readRecent().slice(0, 5));
  }, [open]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), 250);
    return () => window.clearTimeout(timeout);
  }, [value]);

  const searchQuery = api.search.global.useQuery(
    { q: debouncedValue },
    { enabled: open && debouncedValue.trim().length > 0 },
  );

  const folderParam = searchParams.get("folder");
  const createFolderHref = useMemo(() => {
    const params = new URLSearchParams();
    if (folderParam) params.set("folder", folderParam);
    params.set("createFolder", "1");
    return `/scenarios?${params.toString()}`;
  }, [folderParam]);

  function go(item: RecentItem) {
    writeRecent(item);
    setRecent(readRecent().slice(0, 5));
    setOpen(false);
    setValue("");
    router.push(item.href);
  }

  const results = searchQuery.data;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton>
      <Command shouldFilter>
        <CommandInput
          value={value}
          onValueChange={setValue}
          placeholder="Search scenarios, folders, accounts, runs..."
        />
        <CommandList>
          <CommandEmpty>
            {searchQuery.isFetching ? "Searching..." : "No results found."}
          </CommandEmpty>

          {recent.length > 0 && (
            <CommandGroup heading="Recent">
              {recent.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.label} ${item.subtitle ?? ""}`}
                  onSelect={() => go(item)}
                >
                  <History className="size-4" aria-hidden />
                  <CommandItemText label={item.label} subtitle={item.subtitle} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.scenarios.length > 0 && (
            <CommandGroup heading="Scenarios">
              {results.scenarios.map((scenario) => (
                <CommandItem
                  key={scenario.id}
                  value={`${scenario.name} ${scenario.folderPath}`}
                  onSelect={() =>
                    go({
                      id: scenario.id,
                      label: scenario.name,
                      href: `/scenarios/${scenario.id}`,
                      type: "scenario",
                      subtitle: scenario.folderPath || "Root",
                    })
                  }
                >
                  <Zap className="size-4" aria-hidden />
                  <CommandItemText
                    label={scenario.name}
                    subtitle={scenario.folderPath || "Root"}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.folders.length > 0 && (
            <CommandGroup heading="Folders">
              {results.folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  value={`${folder.name} ${folder.parentPath}`}
                  onSelect={() =>
                    go({
                      id: folder.id,
                      label: folder.name,
                      href: `/scenarios?folder=${folder.id}`,
                      type: "folder",
                      subtitle: folder.parentPath || "Root",
                    })
                  }
                >
                  <Folder className="size-4" aria-hidden />
                  <CommandItemText
                    label={folder.name}
                    subtitle={folder.parentPath || "Root"}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.recentRuns.length > 0 && (
            <CommandGroup heading="Runs">
              {results.recentRuns.map((run) => (
                <CommandItem
                  key={run.id}
                  value={`${run.scenarioName} ${run.status}`}
                  onSelect={() =>
                    go({
                      id: run.id,
                      label: run.scenarioName,
                      href: `/runs/${run.id}`,
                      type: "run",
                      subtitle: `${run.status} - ${formatDistanceToNow(run.createdAt, { addSuffix: true })}`,
                    })
                  }
                >
                  <LayoutList className="size-4" aria-hidden />
                  <CommandItemText
                    label={run.scenarioName}
                    subtitle={`${run.status} - ${formatDistanceToNow(run.createdAt, { addSuffix: true })}`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Pages">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.href}
                  value={page.label}
                  onSelect={() =>
                    go({
                      id: page.href,
                      label: page.label,
                      href: page.href,
                      type: "page",
                    })
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  <CommandItemText label={page.label} />
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandGroup heading="Actions">
            <CommandItem
              value="Create scenario"
              onSelect={() =>
                go({
                  id: "create-scenario",
                  label: "Create scenario",
                  href:
                    pathname === "/scenarios" && folderParam
                      ? `/scenarios/new?folder=${folderParam}`
                      : "/scenarios/new",
                  type: "action",
                })
              }
            >
              <FilePlus2 className="size-4" aria-hidden />
              <CommandItemText label="Create scenario" />
            </CommandItem>
            <CommandItem
              value="Create folder in current"
              onSelect={() =>
                go({
                  id: "create-folder",
                  label: "Create folder in current",
                  href: createFolderHref,
                  type: "action",
                })
              }
            >
              <FolderPlus className="size-4" aria-hidden />
              <CommandItemText label="Create folder in current" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function CommandItemText({
  label,
  subtitle,
}: {
  label: string;
  subtitle?: string;
}) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{label}</span>
      {subtitle && (
        <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
      )}
    </span>
  );
}
