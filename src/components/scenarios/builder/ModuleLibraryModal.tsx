"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ModuleLibraryCard } from "./ModuleLibraryCard";
import { MODULES } from "~/lib/modules";
import { getIntegrationMeta } from "~/lib/integration-icons";
import { cn } from "~/lib/utils";
import type { ModuleType } from "~/server/mocks/types";

interface ModuleLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Position where the selected module will be inserted */
  insertAtPosition: number;
  onSelectModule: (moduleType: ModuleType, insertAtPosition: number) => void;
  /** Whether this is a trigger slot (position === 1) — show only trigger modules */
  isTriggerSlot?: boolean;
}

// ─── Section helpers ──────────────────────────────────────────────────────────
//
// Agent C: group filters accept BOTH old + new group name strings so that
// modules added before Phase 3 (group: 'sheets', group: 'trigger') and
// modules added in Phase 3 (group: 'googleSheets', group: 'triggers',
// group: 'bitrix24') all appear in the correct section.

function isTriggerGroup(g: string): boolean {
  return g === "trigger" || g === "triggers";
}

function isSheetsGroup(g: string): boolean {
  return g === "sheets" || g === "googleSheets";
}

function isBitrixGroup(g: string): boolean {
  return g === "bitrix24";
}

// Watch triggers are a sub-group within the Triggers section.
function isWatchTrigger(id: string): boolean {
  return id.startsWith("trigger.watch.");
}

export function ModuleLibraryModal({
  open,
  onOpenChange,
  insertAtPosition,
  onSelectModule,
  isTriggerSlot,
}: ModuleLibraryModalProps) {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<ModuleType | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Flat array of card DOM nodes in visual order — rebuilt each render
  const cardEls = React.useRef<HTMLButtonElement[]>([]);

  // Reset card node array at the start of each render
  cardEls.current = [];

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedId(null);
      // Auto-focus search on open — slight delay to let animation complete
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter by slot (trigger vs action)
  const filteredBySlot = isTriggerSlot
    ? MODULES.filter((m) => isTriggerGroup(m.group))
    : MODULES.filter((m) => !isTriggerGroup(m.group));

  // Filter by search query
  const filtered = filteredBySlot.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  function handleSelect(moduleType: ModuleType) {
    setSelectedId(moduleType);
    onSelectModule(moduleType, insertAtPosition);
    onOpenChange(false);
  }

  function focusCard(index: number) {
    const clamped = Math.max(0, Math.min(index, cardEls.current.length - 1));
    cardEls.current[clamped]?.focus();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onOpenChange(false);
      return;
    }
    if (e.key === "Enter") {
      // Select the first visible card
      const firstCard = cardEls.current[0];
      if (firstCard) firstCard.click();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCard(0);
    }
  }

  // Total flat card count across ALL sections (for keyboard nav bounds)
  // We compute this live rather than from the old SECTIONS array.
  const triggerMods = filtered.filter(
    (m) => isTriggerGroup(m.group) && !isWatchTrigger(m.id),
  );
  const watchMods = filtered.filter((m) => isWatchTrigger(m.id));
  const sheetsMods = filtered.filter((m) => isSheetsGroup(m.group));
  const bitrixMods = filtered.filter((m) => isBitrixGroup(m.group));

  // For trigger slot: triggers (incl. watch). For action slot: sheets + bitrix.
  const visibleCardLists: typeof filtered[] = isTriggerSlot
    ? [triggerMods, watchMods]
    : [sheetsMods, bitrixMods];

  const totalCards = visibleCardLists.reduce((sum, list) => sum + list.length, 0);

  function handleCardKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    flatIndex: number,
  ) {
    if (e.key === "Escape") {
      onOpenChange(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      if (flatIndex + 1 < totalCards) {
        focusCard(flatIndex + 1);
      } else {
        searchRef.current?.focus();
      }
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      if (flatIndex === 0) {
        searchRef.current?.focus();
      } else {
        focusCard(flatIndex - 1);
      }
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  let flatCardIdx = 0;

  function renderCardGrid(mods: typeof filtered) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
        {mods.map((mod) => {
          const idx = flatCardIdx++;
          return (
            <ModuleLibraryCard
              key={mod.id}
              module={mod}
              isSelected={selectedId === mod.id}
              onClick={() => handleSelect(mod.id)}
              onKeyDown={(e) => handleCardKeyDown(e, idx)}
              setRef={(el) => {
                if (el) cardEls.current[idx] = el;
              }}
            />
          );
        })}
      </div>
    );
  }

  function renderSectionHeader(brandModuleType: ModuleType, label: string) {
    const { Icon, tileBg, iconColor } = getIntegrationMeta(brandModuleType);
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded",
            tileBg,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    );
  }

  const hasAnyCards = totalCards > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,1024px)] max-w-none p-0 sm:max-w-none"
        showCloseButton={false}
        aria-label="Module library"
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg">
            {isTriggerSlot ? "Choose trigger" : "Add action step"}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative px-6 pb-3">
          <SearchIcon className="pointer-events-none absolute left-9 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search modules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-11 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
            aria-label="Search modules"
          />
        </div>

        {/* Module list */}
        <div
          className="max-h-[min(78vh,720px)] overflow-y-auto px-6 pb-6"
          role="listbox"
          aria-label="Available modules"
        >
          {!hasAnyCards ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No modules match &quot;{search}&quot;
            </p>
          ) : isTriggerSlot ? (
            /* ── Trigger slot: Schedule/Manual + Watch subgroup ─────────────── */
            <>
              {/* Triggers section — hide if all trigger cards filtered out */}
              {triggerMods.length > 0 && (
                <div className="mb-4">
                  {renderSectionHeader("trigger.schedule", "Triggers")}
                  {renderCardGrid(triggerMods)}

                  {/* Watch subgroup divider — only if any watch modules visible */}
                  {watchMods.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 my-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wide">
                          Watch
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      {renderCardGrid(watchMods)}
                    </>
                  )}
                </div>
              )}

              {/* Watch-only: render without Trigger header if all plain triggers filtered */}
              {triggerMods.length === 0 && watchMods.length > 0 && (
                <div className="mb-4">
                  {renderSectionHeader("trigger.watch.sheets_new_rows", "Watch")}
                  {renderCardGrid(watchMods)}
                </div>
              )}
            </>
          ) : (
            /* ── Action slot: Google Sheets + Bitrix24 ────────────── */
            <>
              {/* Google Sheets section — includes both 'sheets' and 'googleSheets' groups */}
              {sheetsMods.length > 0 && (
                <div className="mb-4">
                  {renderSectionHeader("sheets.append", "Google Sheets")}
                  {renderCardGrid(sheetsMods)}
                </div>
              )}

              {/* Bitrix24 section — group: 'bitrix24' */}
              {bitrixMods.length > 0 && (
                <div className="mb-4">
                  {renderSectionHeader("bitrix.create_lead", "Bitrix24")}
                  {renderCardGrid(bitrixMods)}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
