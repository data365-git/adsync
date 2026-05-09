"use client";

import * as React from "react";
import { ChevronDownIcon, ReplaceIcon, Trash2Icon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";
import {
  ClockIcon,
  ZapIcon,
  BarChart2Icon,
  MegaphoneIcon,
  ImageIcon,
  Table2Icon,
  TablePropertiesIcon,
} from "lucide-react";

const MODULE_ICON_MAP: Record<ModuleType, React.ComponentType<{ className?: string }>> = {
  "trigger.schedule": ClockIcon,
  "trigger.manual": ZapIcon,
  "fb.account_insights": BarChart2Icon,
  "fb.campaign_insights": MegaphoneIcon,
  "fb.ad_insights": ImageIcon,
  "sheets.append": Table2Icon,
  "sheets.upsert": TablePropertiesIcon,
};

interface ModuleConfigShellProps {
  moduleType: ModuleType;
  position: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  isDeleteDisabled?: boolean;
  /**
   * When provided (typically for the position-1 trigger step), render a
   * "Change trigger" button instead of the delete button. Clicking it should
   * open the module library filtered to triggers.
   */
  onChangeTrigger?: () => void;
  /** Drag handle element to render in header */
  dragHandle?: React.ReactNode;
  children: React.ReactNode;
  /** Whether this step has validation errors */
  hasError?: boolean;
}

export function ModuleConfigShell({
  moduleType,
  position,
  isExpanded,
  onToggleExpand,
  onDelete,
  isDeleteDisabled,
  onChangeTrigger,
  dragHandle,
  children,
  hasError,
}: ModuleConfigShellProps) {
  const mod = getModule(moduleType);
  const Icon = MODULE_ICON_MAP[moduleType];

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-colors",
        hasError ? "border-destructive/50" : "border-border",
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Position pill */}
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          aria-label={`Step ${position}`}
        >
          {position}
        </span>

        {/* Module icon */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-foreground/70" />
        </div>

        {/* Module name */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {mod?.name ?? moduleType}
          </p>
          {!isExpanded && (
            <p className="truncate text-xs text-muted-foreground">
              {mod?.description}
            </p>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Expand/collapse */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-md p-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse step" : "Expand step"}
          >
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </button>

          {/* Change trigger (position-1 only) — replaces the delete slot */}
          {onChangeTrigger && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={onChangeTrigger}
                      aria-label="Change trigger module"
                    >
                      <ReplaceIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  }
                />
                <TooltipContent side="top">Change trigger</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Delete (non-trigger steps only) */}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              disabled={isDeleteDisabled}
              aria-label={`Delete step ${position}`}
              aria-disabled={isDeleteDisabled}
            >
              <Trash2Icon className="size-3.5 text-muted-foreground" />
            </Button>
          )}

          {/* Drag handle */}
          {dragHandle}
        </div>
      </div>

      {/* Config form */}
      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
