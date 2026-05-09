"use client";

import * as React from "react";
import {
  ClockIcon,
  ZapIcon,
  BarChart2Icon,
  MegaphoneIcon,
  ImageIcon,
  Table2Icon,
  TablePropertiesIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { ModuleType } from "~/server/mocks/types";
import type { ModuleDefinition } from "~/lib/modules";

const MODULE_ICON_MAP: Record<ModuleType, React.ComponentType<{ className?: string }>> = {
  "trigger.schedule": ClockIcon,
  "trigger.manual": ZapIcon,
  "fb.account_insights": BarChart2Icon,
  "fb.campaign_insights": MegaphoneIcon,
  "fb.ad_insights": ImageIcon,
  "sheets.append": Table2Icon,
  "sheets.upsert": TablePropertiesIcon,
};

interface ModuleLibraryCardProps {
  module: ModuleDefinition;
  isSelected?: boolean;
  onClick: () => void;
}

export function ModuleLibraryCard({
  module,
  isSelected,
  onClick,
}: ModuleLibraryCardProps) {
  const Icon = MODULE_ICON_MAP[module.id];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
      )}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-foreground/70" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{module.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {module.description}
        </p>
      </div>
    </button>
  );
}
