"use client";

// TODO: add @dnd-kit/core to dependencies

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  Folder,
  FolderInput,
  FolderPlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import {
  parseAsString,
  parseAsArrayOf,
  parseAsStringLiteral,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import type { Scenario } from "~/server/mocks/types";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { FolderRow } from "./FolderRow";
import { ScenarioRow } from "./ScenarioRow";
import { ScenarioCard } from "./ScenarioCard";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { MoveToFolderDialog } from "./MoveToFolderDialog";

// ── URL state parsers ─────────────────────────────────────────────────────────

const folderParser = parseAsString.withDefault("");
const qParser = parseAsString.withDefault("");
const scopeParser = parseAsStringLiteral(["this", "all"] as const).withDefault(
  "this",
);
const sortParser = parseAsStringEnum(["name", "updated", "lastRun"]).withDefault(
  "updated",
);
const dirParser = parseAsStringLiteral(["asc", "desc"] as const).withDefault(
  "desc",
);
const kindParser = parseAsStringLiteral(["custom", "quicksetup"] as const);
const enabledParser = parseAsStringLiteral(["1", "0"] as const);
const selectedParser = parseAsArrayOf(parseAsString).withDefault([]);

// ── Component ─────────────────────────────────────────────────────────────────

type ScenariosClientProps = {
  /** When true, the create-folder dialog opens (controlled from parent) */
  externalCreateFolderOpen?: boolean;
  onExternalCreateFolderClose?: () => void;
};

type ScenarioDropResult =
  | { status: "move"; scenarioId: string; folderId: string | null; name: string }
  | { status: "same-folder"; name: string }
  | { status: "missing" };

export function resolveScenarioFolderDrop({
  scenarioId,
  targetFolderId,
  scenarios,
}: {
  scenarioId: string;
  targetFolderId: string | null;
  scenarios: Pick<Scenario, "id" | "name" | "folderId">[];
}): ScenarioDropResult {
  const scenario = scenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    return { status: "missing" };
  }

  if ((scenario.folderId ?? null) === targetFolderId) {
    return { status: "same-folder", name: scenario.name };
  }

  return {
    status: "move",
    scenarioId,
    folderId: targetFolderId,
    name: scenario.name,
  };
}

export function ScenariosClient({
  externalCreateFolderOpen = false,
  onExternalCreateFolderClose,
}: ScenariosClientProps = {}) {
  const router = useRouter();

  // URL state
  const [folderParam, setFolderParam] = useQueryState("folder", folderParser);
  const [q, setQ] = useQueryState("q", qParser);
  const [scope, setScope] = useQueryState("scope", scopeParser);
  const [sort, setSort] = useQueryState("sort", sortParser);
  const [dir] = useQueryState("dir", dirParser);
  const [kind, setKind] = useQueryState("kind", kindParser);
  const [enabled, setEnabled] = useQueryState("enabled", enabledParser);
  const [createFolderParam, setCreateFolderParam] = useQueryState(
    "createFolder",
    parseAsStringLiteral(["1"] as const),
  );
  const [selectedParam, setSelectedParam] = useQueryState(
    "selected",
    selectedParser,
  );

  // Derive current folder id (empty string = root)
  const currentFolderId = folderParam || null;

  // Local UI state
  const [_createFolderOpen, _setCreateFolderOpen] = useState(false);
  const createFolderOpen = _createFolderOpen || externalCreateFolderOpen;
  const setCreateFolderOpen = useCallback(
    (val: boolean) => {
      _setCreateFolderOpen(val);
      if (!val) onExternalCreateFolderClose?.();
    },
    [onExternalCreateFolderClose],
  );
  const [moveOpen, setMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [optimisticScenarios, setOptimisticScenarios] = useState<Scenario[] | null>(
    null,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const [debouncedQ, setDebouncedQ] = useState(q);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (createFolderParam !== "1") return;
    setCreateFolderOpen(true);
    void setCreateFolderParam(null);
  }, [createFolderParam, setCreateFolderOpen, setCreateFolderParam]);

  // Build query params for scenarios.list
  const listInput = {
    folderId: scope === "all" ? undefined : currentFolderId,
    q: debouncedQ || undefined,
    scope: scope || undefined,
    sort,
    dir,
    kind:
      kind === "custom"
        ? ("CUSTOM" as const)
        : kind === "quicksetup"
          ? ("QUICK_SETUP" as const)
          : undefined,
    enabled: enabled === "1" ? true : enabled === "0" ? false : undefined,
  };

  const scenariosQuery = api.scenarios.list.useQuery(listInput);
  const foldersQuery = api.folders.list.useQuery({
    parentId: currentFolderId,
  });
  const runCounts = api.scenarios.runCounts.useQuery();
  const utils = api.useUtils();

  const bulkDeleteMutation = api.scenarios.bulkDelete.useMutation({
    onSuccess(res) {
      toast.success(
        `${res.count} scenario${res.count === 1 ? "" : "s"} deleted`,
      );
      void utils.scenarios.list.invalidate();
      clearSelection();
    },
    onError() {
      toast.error("Failed to delete scenarios. Please try again.");
    },
  });

  const bulkEnabledMutation = api.scenarios.bulkSetEnabled.useMutation({
    onSuccess(res) {
      toast.success(
        `${res.count} scenario${res.count === 1 ? "" : "s"} updated`,
      );
      void utils.scenarios.list.invalidate();
      clearSelection();
    },
    onError() {
      toast.error("Failed to update scenarios. Please try again.");
    },
  });

  const scenariosMoveMutation = api.scenarios.move.useMutation();

  const scenarios: Scenario[] = useMemo(
    () => optimisticScenarios ?? scenariosQuery.data ?? [],
    [optimisticScenarios, scenariosQuery.data],
  );
  const folders = useMemo(
    () => foldersQuery.data ?? [],
    [foldersQuery.data],
  );
  const breadcrumbQuery = api.folders.breadcrumb.useQuery(
    { id: currentFolderId! },
    { enabled: currentFolderId !== null },
  );
  const runCountMap: Record<string, number> = runCounts.data ?? {};
  const selectedIds = useMemo(() => new Set(selectedParam), [selectedParam]);

  useEffect(() => {
    setOptimisticScenarios(null);
  }, [scenariosQuery.data]);

  const isLoading = scenariosQuery.isLoading || foldersQuery.isLoading;
  const isError = scenariosQuery.isError || foldersQuery.isError;

  // Selection state
  const allItemIds = useMemo(
    () => [
      ...folders.map((f) => `folder:${f.id}`),
      ...scenarios.map((s) => s.id),
    ],
    [folders, scenarios],
  );
  const allVisibleSelected =
    allItemIds.length > 0 && allItemIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = allItemIds.some((id) => selectedIds.has(id));
  const selectedScenarioIds = Array.from(selectedIds).filter(
    (id) => !id.startsWith("folder:"),
  );
  const selectedFolderIds = Array.from(selectedIds)
    .filter((id) => id.startsWith("folder:"))
    .map((id) => id.replace("folder:", ""));

  const clearSelection = useCallback(() => {
    void setSelectedParam(null);
  }, [setSelectedParam]);

  const toggleId = useCallback((id: string, checked: boolean) => {
    const next = new Set(selectedParam);
      if (checked) next.add(id);
      else next.delete(id);
    void setSelectedParam(next.size > 0 ? Array.from(next) : null);
  }, [selectedParam, setSelectedParam]);

  const toggleAll = useCallback(
    (checked: boolean) => {
      const next = new Set(selectedParam);
        for (const id of allItemIds) {
          if (checked) next.add(id);
          else next.delete(id);
        }
      void setSelectedParam(next.size > 0 ? Array.from(next) : null);
    },
    [allItemIds, selectedParam, setSelectedParam],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (isEditable) return;

      if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === "n" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const href = currentFolderId
          ? `/scenarios/new?folder=${currentFolderId}`
          : "/scenarios/new";
        router.push(href);
      }
      if (e.key.toLowerCase() === "n" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCreateFolderOpen(true);
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        clearSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentFolderId, router, clearSelection, setCreateFolderOpen]);

  function handleNavigate(id: string | null) {
    void setFolderParam(id ?? "");
    clearSelection();
    void setQ("");
    void setScope("this");
  }

  function handleFolderDeleted(id: string) {
    toggleId(`folder:${id}`, false);
    void utils.folders.list.invalidate();
    void utils.folders.tree.invalidate();
    void utils.scenarios.list.invalidate();
  }

  function handleScenarioDuplicated(newScenario: Scenario) {
    void utils.scenarios.list.invalidate();
    toast.success(`"${newScenario.name}" duplicated`);
  }

  function handleScenarioDeleted(id: string) {
    toggleId(id, false);
    void utils.scenarios.list.invalidate();
  }

  function handleScenarioDropped(scenarioId: string, folderId: string | null) {
    const result = resolveScenarioFolderDrop({
      scenarioId,
      targetFolderId: folderId,
      scenarios,
    });

    if (result.status === "missing") return;

    if (result.status === "same-folder") {
      toast.info("Already in this folder");
      return;
    }

    const previousScenarios = scenarios;
    const nextScenarios =
      scope === "all"
        ? previousScenarios.map((scenario) =>
            scenario.id === result.scenarioId
              ? { ...scenario, folderId: result.folderId }
              : scenario,
          )
        : previousScenarios.filter(
            (scenario) => scenario.id !== result.scenarioId,
          );

    setOptimisticScenarios(nextScenarios);

    scenariosMoveMutation.mutate(
      { ids: [result.scenarioId], folderId: result.folderId },
      {
        onSuccess() {
          const folderName =
            folders.find((folder) => folder.id === result.folderId)?.name ??
            "Home";
          toast.success(`Moved "${result.name}" into ${folderName}`);
          void utils.scenarios.list.invalidate();
          void utils.folders.list.invalidate();
          void utils.folders.tree.invalidate();
        },
        onError(err) {
          setOptimisticScenarios(previousScenarios);
          toast.error(err.message ?? `Failed to move "${result.name}".`);
        },
      },
    );
  }

  const isEmpty =
    !isLoading && !isError && folders.length === 0 && scenarios.length === 0;
  const isSearchEmpty = !isLoading && !isError && debouncedQ && scenarios.length === 0;

  const currentFolderName =
    breadcrumbQuery.data?.[breadcrumbQuery.data.length - 1]?.name ?? null;

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <FolderBreadcrumb
            folderId={currentFolderId}
            onNavigate={handleNavigate}
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 py-16 text-center">
          <AlertCircle className="size-8 text-red-600" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-900">
              Failed to load scenarios
            </p>
            <p className="text-sm text-slate-500">
              Check your connection and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void scenariosQuery.refetch();
              void foldersQuery.refetch();
            }}
            disabled={scenariosQuery.isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${scenariosQuery.isFetching ? "motion-safe:animate-spin" : ""}`}
              aria-hidden
            />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <FolderBreadcrumb
          folderId={currentFolderId}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => void setQ(e.target.value)}
              placeholder={
                currentFolderId
                  ? "Search in this folder…"
                  : "Search scenarios…"
              }
              aria-label="Search scenarios"
              className="h-8 w-full rounded-lg border border-slate-300 bg-white py-1 pr-3 pl-8 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            />
          </div>

          {/* Scope toggle — only when inside a folder */}
          {currentFolderId && (
            <div
              className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
              role="group"
              aria-label="Search scope"
            >
              <button
                onClick={() => void setScope("this")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  scope === "this"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                aria-pressed={scope === "this"}
              >
                This folder
              </button>
              <button
                onClick={() => void setScope("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  scope === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                aria-pressed={scope === "all"}
              >
                All
              </button>
            </div>
          )}

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
              aria-label="Sort scenarios"
            >
              Sort: {sort === "name" ? "Name" : sort === "lastRun" ? "Last run" : "Updated"}
              <ChevronDown className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void setSort("updated")}>
                Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void setSort("name")}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void setSort("lastRun")}>
                Last run
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton active={kind === null} onClick={() => void setKind(null)}>
            Kind: All
          </FilterButton>
          <FilterButton
            active={kind === "custom"}
            onClick={() => void setKind(kind === "custom" ? null : "custom")}
          >
            Custom
          </FilterButton>
          <FilterButton
            active={kind === "quicksetup"}
            onClick={() =>
              void setKind(kind === "quicksetup" ? null : "quicksetup")
            }
          >
            Quick Setup
          </FilterButton>
          <FilterButton
            active={enabled === null}
            onClick={() => void setEnabled(null)}
          >
            Enabled: All
          </FilterButton>
          <FilterButton
            active={enabled === "1"}
            onClick={() => void setEnabled(enabled === "1" ? null : "1")}
          >
            Enabled
          </FilterButton>
          <FilterButton
            active={enabled === "0"}
            onClick={() => void setEnabled(enabled === "0" ? null : "0")}
          >
            Disabled
          </FilterButton>
        </div>
      </div>

      {/* Empty state: search returned nothing */}
      {isSearchEmpty && folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="rounded-full bg-slate-100 p-3">
            <Search className="size-6 text-slate-500" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-900">
              No scenarios match &ldquo;{debouncedQ}&rdquo;
            </p>
            <p className="text-sm text-slate-500">
              {currentFolderId && scope === "this"
                ? "Try searching all folders instead."
                : "Try a different search term."}
            </p>
          </div>
          {currentFolderId && scope === "this" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setScope("all")}
            >
              Search all folders
            </Button>
          )}
        </div>
      ) : isEmpty ? (
        /* Empty state: no content at all */
        <EmptyState
          folderId={currentFolderId}
          onNewFolder={() => setCreateFolderOpen(true)}
        />
      ) : (
        <>
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <BulkActionBar
              selectedScenarioIds={selectedScenarioIds}
              selectedFolderIds={selectedFolderIds}
              onClear={clearSelection}
              onEnable={() =>
                bulkEnabledMutation.mutate({
                  ids: selectedScenarioIds,
                  enabled: true,
                })
              }
              onDisable={() =>
                bulkEnabledMutation.mutate({
                  ids: selectedScenarioIds,
                  enabled: false,
                })
              }
              onDelete={() => setBulkDeleteOpen(true)}
              onMove={() => setMoveOpen(true)}
              isPending={
                bulkDeleteMutation.isPending || bulkEnabledMutation.isPending
              }
            />
          )}

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full" aria-label="Scenarios">
              <TableHeader>
                <TableRow className="h-10 border-b border-slate-200 bg-slate-50">
                  <TableHead className="w-10 px-4 text-left text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && someVisibleSelected}
                      onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="px-4 pl-5 text-left text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">
                    Name
                  </TableHead>
                  <TableHead className="px-4 text-left text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">
                    Kind
                  </TableHead>
                  <TableHead className="px-4 text-left text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">
                    Enabled
                  </TableHead>
                  <TableHead className="px-4 text-left text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">
                    Last Run
                  </TableHead>
                  <TableHead className="sr-only w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Folder rows first */}
                {folders.map((folder) => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    onScenarioDrop={handleScenarioDropped}
                    selected={selectedIds.has(`folder:${folder.id}`)}
                    onSelectedChange={(checked) =>
                      toggleId(`folder:${folder.id}`, checked)
                    }
                    onNavigate={handleNavigate}
                    onDeleted={handleFolderDeleted}
                    onRenamed={() => void foldersQuery.refetch()}
                    onMoved={() => {
                      void utils.folders.list.invalidate();
                      void utils.folders.tree.invalidate();
                    }}
                    searchQuery={debouncedQ}
                  />
                ))}

                {/* Scenario rows */}
                {scenarios.map((scenario) => (
                  <ScenarioRow
                    key={scenario.id}
                    scenario={scenario}
                    draggable
                    runCount={runCountMap[scenario.id]}
                    onDuplicated={handleScenarioDuplicated}
                    onDeleted={handleScenarioDeleted}
                    selected={selectedIds.has(scenario.id)}
                    onSelectedChange={(checked) =>
                      toggleId(scenario.id, checked)
                    }
                    searchQuery={debouncedQ}
                  />
                ))}
              </TableBody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-4 md:hidden">
            {/* Folder cards on mobile */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleNavigate(folder.id)}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
              >
                <Folder className="size-5 shrink-0 text-slate-500" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-slate-900">
                    {folder.name}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {folder._count.scenarios} scenario
                    {folder._count.scenarios === 1 ? "" : "s"}
                  </span>
                </div>
              </button>
            ))}
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                runCount={runCountMap[scenario.id]}
                onDuplicated={handleScenarioDuplicated}
                onDeleted={handleScenarioDeleted}
              />
            ))}
          </div>
        </>
      )}

      {/* FAB for mobile */}
      <div className="fixed right-4 bottom-6 md:hidden" style={{ zIndex: 40 }}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
            aria-label="New item"
          >
            <Plus className="size-6" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem
              render={
                <Link
                  href={
                    currentFolderId
                      ? `/scenarios/new?folder=${currentFolderId}`
                      : "/scenarios/new"
                  }
                />
              }
            >
              <Zap className="size-4" aria-hidden />
              New scenario
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="size-4" aria-hidden />
              New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create folder dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        parentId={currentFolderId}
        parentName={currentFolderName}
        onCreated={(newId) => {
          void utils.folders.list.invalidate();
          void utils.folders.tree.invalidate();
          toggleId(`folder:${newId}`, false);
        }}
      />

      {/* Move to folder dialog */}
      {moveOpen && (
        <MoveToFolderDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          scenarioIds={selectedScenarioIds}
          currentParentId={currentFolderId}
          onMoved={() => {
            void utils.scenarios.list.invalidate();
            void utils.folders.list.invalidate();
            clearSelection();
          }}
        />
      )}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected scenarios?</AlertDialogTitle>
            <AlertDialogDescription>
              Type DELETE to permanently delete {selectedScenarioIds.length} selected
              scenario{selectedScenarioIds.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                deleteConfirmText !== "DELETE" || bulkDeleteMutation.isPending
              }
              onClick={() => {
                bulkDeleteMutation.mutate({ ids: selectedScenarioIds });
                setDeleteConfirmText("");
                setBulkDeleteOpen(false);
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-md border px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

// ── Page header + "New ▾" split button ───────────────────────────────────────

type PageHeaderProps = {
  currentFolderId: string | null;
  onNewFolder: () => void;
};

export function ScenariosPageHeader({
  currentFolderId,
  onNewFolder,
}: PageHeaderProps) {
  const newHref = currentFolderId
    ? `/scenarios/new?folder=${currentFolderId}`
    : "/scenarios/new";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-medium tracking-tight">Scenarios</h1>
        <p className="text-base text-slate-500">
          Build and manage automation flows.
        </p>
      </div>

      {/* Split "New ▾" button */}
      <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <Button
          render={<Link href={newHref} />}
          className="rounded-none rounded-l-lg border-r border-slate-200"
          size="default"
        >
          <Plus className="size-4" aria-hidden />
          New scenario
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 items-center justify-center rounded-r-lg bg-slate-900 px-2 text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
            aria-label="More new options"
          >
            <ChevronDown className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={newHref} />}>
              <Zap className="size-4" aria-hidden />
              New scenario
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewFolder}>
              <FolderPlus className="size-4" aria-hidden />
              New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkActionBar({
  selectedScenarioIds,
  selectedFolderIds,
  onClear,
  onEnable,
  onDisable,
  onDelete,
  onMove,
  isPending,
}: {
  selectedScenarioIds: string[];
  selectedFolderIds: string[];
  onClear: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
  onMove: () => void;
  isPending: boolean;
}) {
  const total = selectedScenarioIds.length + selectedFolderIds.length;

  return (
    <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm shadow-md md:static md:shadow-none">
      <span className="text-slate-700">
        {total} selected{" "}
        {selectedFolderIds.length > 0 &&
          `(${selectedFolderIds.length} folder${selectedFolderIds.length === 1 ? "" : "s"})`}
      </span>
      <div className="flex items-center gap-1.5">
        {selectedScenarioIds.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMove}
              disabled={isPending}
            >
              <FolderInput className="size-3.5" aria-hidden />
              Move to folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEnable}
              disabled={isPending}
            >
              Enable
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisable}
              disabled={isPending}
            >
              Disable
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isPending}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={onClear} disabled={isPending}>
          Clear
        </Button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  folderId,
  onNewFolder,
}: {
  folderId: string | null;
  onNewFolder: () => void;
}) {
  const newHref = folderId ? `/scenarios/new?folder=${folderId}` : "/scenarios/new";

  if (folderId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
        <div className="rounded-full bg-slate-100 p-3">
          <Folder className="size-6 text-slate-500" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-slate-900">
            Nothing in this folder yet
          </p>
          <p className="text-sm text-slate-500">
            Create a scenario or add a subfolder.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="default" size="default" render={<Link href={newHref} />}>
            <Plus className="size-4" aria-hidden />
            New scenario
          </Button>
          <Button variant="outline" size="default" onClick={onNewFolder}>
            <FolderPlus className="size-4" aria-hidden />
            New folder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <Zap className="size-6 text-slate-500" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-900">No scenarios yet</p>
        <p className="text-sm text-slate-500">
          Create your first automation, or organize work into folders.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="default"
          size="default"
          render={<Link href="/scenarios/new?from=template" />}
        >
          Start from a template
        </Button>
        <Button
          variant="outline"
          size="default"
          render={<Link href="/scenarios/new" />}
        >
          Build from scratch
        </Button>
        <Button variant="outline" size="default" onClick={onNewFolder}>
          <FolderPlus className="size-4" aria-hidden />
          New folder
        </Button>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb skeleton */}
      <div className="flex h-6 items-center gap-2 motion-safe:animate-pulse motion-reduce:opacity-70">
        <div className="h-4 w-12 rounded bg-slate-200" />
        <div className="h-3.5 w-3.5 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
      {/* Toolbar skeleton */}
      <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm motion-safe:animate-pulse motion-reduce:opacity-70">
        <div className="h-8 flex-1 rounded-lg bg-slate-200" />
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
      </div>
      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <div className="h-10 border-b border-slate-200 bg-slate-50" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex h-[52px] items-center gap-4 border-b border-slate-100 px-4 motion-safe:animate-pulse motion-reduce:opacity-70"
          >
            <div className="size-4 rounded bg-slate-200" />
            <div className="flex flex-1 flex-col gap-1">
              <div className="h-4 w-48 rounded bg-slate-200" />
            </div>
            <div className="h-5 w-16 rounded-full bg-slate-200" />
            <div className="h-[18px] w-8 rounded-full bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      {/* Mobile skeleton */}
      <div className="flex flex-col gap-4 md:hidden">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-slate-200 bg-slate-100 motion-safe:animate-pulse motion-reduce:opacity-70"
          />
        ))}
      </div>
    </div>
  );
}
