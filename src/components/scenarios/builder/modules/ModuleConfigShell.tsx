"use client";

import * as React from "react";
import { Pencil, ReplaceIcon, Trash2Icon } from "lucide-react";
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
import type { ComponentType, SVGProps } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleConfigShellProps {
  moduleType: ModuleType;
  position: number;
  /** True when this step is currently being edited in the modal — highlights the card. */
  isExpanded: boolean;
  /** Called when the user clicks the card to open the config modal. */
  onToggleExpand: () => void;
  onDelete?: () => void;
  isDeleteDisabled?: boolean;
  /** Trigger-slot only — swap the trigger module. */
  onChangeTrigger?: () => void;
  /** Drag handle element to render in header */
  dragHandle?: React.ReactNode;
  /** Whether this step has validation errors */
  hasError?: boolean;
  /** One-line summary from summarizeStep — shown under the name when configured */
  summary?: string;
  /** Brand icon component from getIntegrationMeta */
  BrandIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  tileBg?: string;
  iconColor?: string;
  moduleName?: string;
  moduleDescription?: string;
  moduleSubtitle?: string;
  iteratorBadge?: React.ReactNode;
}

// ─── Main component (collapsed card only — config form lives in StepConfigModal) ──

export function ModuleConfigShell({
  moduleType,
  position,
  isExpanded,
  onToggleExpand,
  onDelete,
  isDeleteDisabled,
  onChangeTrigger,
  dragHandle,
  hasError,
  summary,
  BrandIcon,
  tileBg = "bg-muted",
  iconColor = "text-foreground/70",
  moduleName,
  moduleDescription,
  moduleSubtitle,
  iteratorBadge,
}: ModuleConfigShellProps) {
  const mod = getModule(moduleType);
  const displayName = moduleName ?? mod?.name ?? moduleType;
  const displayDescription = moduleDescription ?? mod?.description ?? "";
  const displaySubtitle = moduleSubtitle ?? mod?.shortName ?? mod?.group ?? "";

  return (
    <div
      className={cn(
        "bg-card rounded-xl border transition-colors",
        hasError
          ? "border-destructive/50"
          : isExpanded
            ? "border-ring"
            : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          "flex w-full items-center gap-4 px-5 py-4 text-left",
          "focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none",
        )}
        aria-label={`Configure step ${position}: ${displayName}`}
      >
        {/* Position-number badge — Zapier-style */}
        <div
          className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
          aria-hidden="true"
        >
          {position}
        </div>

        {/* Brand icon tile */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            tileBg,
          )}
        >
          {BrandIcon ? (
            <BrandIcon className={cn("h-4 w-4", iconColor)} />
          ) : null}
        </div>

        {/* Name + summary/description (stacked) */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="text-foreground min-w-0 truncate text-base">
              {displayName}
            </p>
            {iteratorBadge}
          </div>
          {displaySubtitle ? (
            <p className="text-muted-foreground truncate text-xs">
              {displaySubtitle}
            </p>
          ) : null}
          {(summary ?? displayDescription) && (
            <p className="text-muted-foreground truncate text-sm">
              {summary ?? displayDescription}
            </p>
          )}
        </div>

        {/* Right controls — stop propagation so individual buttons don't open the modal */}
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit icon — visual cue that clicking opens the config modal */}
          <span
            aria-hidden="true"
            className="text-muted-foreground p-1.5"
            title="Click card to configure"
          >
            <Pencil className="size-4" />
          </span>

          {/* Change trigger (position-1 only) */}
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
                      <ReplaceIcon className="text-muted-foreground size-3.5" />
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
              <Trash2Icon className="text-muted-foreground size-3.5" />
            </Button>
          )}

          {/* Drag handle rendered here */}
          {dragHandle}
        </div>
      </button>
    </div>
  );
}
