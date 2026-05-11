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

// Section config: each section declares a representative moduleType for branding
// and which MODULES.group it corresponds to.
const SECTIONS: Array<{
  group: string;
  label: string;
  brandModule: ModuleType;
}> = [
  { group: "trigger", label: "Triggers", brandModule: "trigger.schedule" },
  { group: "facebook", label: "Facebook Ads", brandModule: "fb.account_insights" },
  { group: "sheets", label: "Google Sheets", brandModule: "sheets.append" },
];

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

  // Filter modules
  const filteredBySlot = isTriggerSlot
    ? MODULES.filter((m) => m.group === "trigger")
    : MODULES.filter((m) => m.group !== "trigger");

  const filtered = filteredBySlot.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  // Group filtered modules, preserving SECTIONS order; hide empty sections
  const sections = React.useMemo(() => {
    return SECTIONS.map((sec) => ({
      ...sec,
      mods: filtered.filter((m) => m.group === sec.group),
    })).filter((sec) => sec.mods.length > 0);
  }, [filtered]);

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
    // Enter while in search → select first visible card
    if (e.key === "Enter") {
      const firstSection = sections[0];
      const firstMod = firstSection?.mods[0];
      if (firstMod) handleSelect(firstMod.id);
      return;
    }
    // Arrow Down → move focus to first card
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCard(0);
    }
  }

  function handleCardKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    flatIndex: number,
    totalCards: number,
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
        // Last card → Tab loops to search
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
    // Enter / Space fire the button's onClick naturally
  }

  // Compute total visible card count for keyboard nav bounds
  const totalCards = sections.reduce((sum, s) => sum + s.mods.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0"
        showCloseButton={false}
        aria-label="Module library"
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            {isTriggerSlot ? "Choose trigger" : "Add action step"}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative px-4 pb-2">
          <SearchIcon className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search modules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
            aria-label="Search modules"
          />
        </div>

        {/* Module list */}
        <div
          className="max-h-[400px] overflow-y-auto px-4 pb-4"
          role="listbox"
          aria-label="Available modules"
        >
          {sections.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No modules match &quot;{search}&quot;
            </p>
          ) : (
            sections.map((sec, sectionIdx) => {
              // Compute flat start index for this section
              const sectionStart = sections
                .slice(0, sectionIdx)
                .reduce((sum, s) => sum + s.mods.length, 0);
              const { Icon, tileBg, iconColor } = getIntegrationMeta(sec.brandModule);

              return (
                <div key={sec.group} className="mb-4">
                  {/* Branded section header */}
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
                      {sec.label}
                    </span>
                  </div>

                  {/* 2-col card grid */}
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {sec.mods.map((mod, modIdx) => {
                      const flatIndex = sectionStart + modIdx;
                      return (
                        <ModuleLibraryCard
                          key={mod.id}
                          module={mod}
                          isSelected={selectedId === mod.id}
                          onClick={() => handleSelect(mod.id)}
                          onKeyDown={(e) =>
                            handleCardKeyDown(e, flatIndex, totalCards)
                          }
                          setRef={(el) => {
                            if (el) cardEls.current[flatIndex] = el;
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
