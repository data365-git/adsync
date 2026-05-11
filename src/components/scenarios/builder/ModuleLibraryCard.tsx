"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { getIntegrationMeta } from "~/lib/integration-icons";
import type { ModuleType } from "~/server/mocks/types";
import type { ModuleDefinition } from "~/lib/modules";

interface ModuleLibraryCardProps {
  module: ModuleDefinition;
  isSelected?: boolean;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  /** Ref callback so the modal can track card DOM nodes for arrow-key focus */
  setRef?: (el: HTMLButtonElement | null) => void;
}

export function ModuleLibraryCard({
  module,
  isSelected,
  onClick,
  onKeyDown,
  setRef,
}: ModuleLibraryCardProps) {
  const { Icon, tileBg, iconColor } = getIntegrationMeta(module.id as ModuleType);

  return (
    <button
      ref={setRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left",
        "transition-all duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
      )}
      role="option"
      aria-selected={isSelected}
    >
      {/* Brand tile */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          tileBg,
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{module.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-3">
          {module.description}
        </p>
      </div>
    </button>
  );
}
