"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { getIntegrationMeta } from "~/lib/integration-icons";
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
  const { Icon, tileBg, iconColor } = getIntegrationMeta(module.id);

  return (
    <button
      ref={setRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left",
        "transition-all duration-100",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
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
        <p className="text-foreground text-sm font-medium">{module.name}</p>
        <p className="text-muted-foreground mt-0.5 line-clamp-3 text-xs">
          {module.description}
        </p>
      </div>
    </button>
  );
}
