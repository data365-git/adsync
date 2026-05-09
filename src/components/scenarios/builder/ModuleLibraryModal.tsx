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

const GROUP_LABELS: Record<string, string> = {
  trigger: "Triggers",
  facebook: "Facebook",
  sheets: "Google Sheets",
};

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

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedId(null);
      // Auto-focus search on open, slight delay to let animation complete
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

  // Group filtered
  const groups = React.useMemo(() => {
    const groupMap = new Map<string, typeof MODULES>();
    for (const mod of filtered) {
      const existing = groupMap.get(mod.group) ?? [];
      groupMap.set(mod.group, [...existing, mod]);
    }
    return groupMap;
  }, [filtered]);

  function handleSelect(moduleType: ModuleType) {
    setSelectedId(moduleType);
    onSelectModule(moduleType, insertAtPosition);
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
    // Enter selects the highlighted (selected) card
    if (e.key === "Enter" && selectedId) {
      handleSelect(selectedId);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0"
        showCloseButton={false}
        aria-label="Module library"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            {isTriggerSlot ? "Choose trigger" : "Add action step"}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative px-4 pb-2">
          <SearchIcon className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search modules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          {groups.size === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No modules match &quot;{search}&quot;
            </p>
          ) : (
            Array.from(groups.entries()).map(([group, mods]) => (
              <div key={group} className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABELS[group] ?? group}
                </p>
                <div className="space-y-1.5">
                  {mods.map((mod) => (
                    <ModuleLibraryCard
                      key={mod.id}
                      module={mod}
                      isSelected={selectedId === mod.id}
                      onClick={() => handleSelect(mod.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
