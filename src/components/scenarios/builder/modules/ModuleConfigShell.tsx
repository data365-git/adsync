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
import type { ComponentType, SVGProps } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "ready" | "needs-config" | "empty";

interface ModuleConfigShellProps {
  moduleType: ModuleType;
  position: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  isDeleteDisabled?: boolean;
  /**
   * When provided (typically for the position-1 trigger step), render a
   * "Change trigger" button instead of the delete button.
   */
  onChangeTrigger?: () => void;
  /** Drag handle element to render in header */
  dragHandle?: React.ReactNode;
  children: React.ReactNode;
  /** Whether this step has validation errors */
  hasError?: boolean;
  // ── B.1 collapsed card props ──
  /** One-line summary from summarizeStep */
  summary?: string;
  /** Overall step status */
  status?: StepStatus;
  /** Brand icon component from getIntegrationMeta */
  BrandIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tile background class e.g. bg-fb-blue/10 */
  tileBg?: string;
  /** Icon color class e.g. text-fb-blue */
  iconColor?: string;
  /** Module display name */
  moduleName?: string;
  /** Module description */
  moduleDescription?: string;
  /**
   * Agent C — optional iterator badge element rendered after the module name
   * in the collapsed header. Passed from StepCard when the upstream step
   * produces an array.
   */
  iteratorBadge?: React.ReactNode;
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StepStatus }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
        <span aria-hidden="true">✓</span>
        Ready
      </span>
    );
  }
  if (status === "needs-config") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        <span aria-hidden="true">⚠</span>
        Needs config
      </span>
    );
  }
  // empty
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <span aria-hidden="true">◯</span>
      Empty
    </span>
  );
}

// ─── Sample tab ───────────────────────────────────────────────────────────────

function SampleTab({ moduleType }: { moduleType: ModuleType }) {
  const mod = getModule(moduleType);
  const isTrigger =
    moduleType === "trigger.schedule" || moduleType === "trigger.manual";

  if (isTrigger) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          This trigger has no sample output. Add a downstream step to see its output.
        </p>
      </div>
    );
  }

  if (!mod || mod.sampleOutput.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground italic">
        No sample output available.
      </p>
    );
  }

  const firstRow = mod.sampleOutput[0] ?? {};
  const columns = Object.keys(firstRow).slice(0, 5);
  const rows = mod.sampleOutput.slice(0, 3);

  function truncate(val: unknown): string {
    if (val === null || val === undefined) return "";
    let str: string;
    if (typeof val === "string") str = val;
    else if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") str = val.toString();
    else str = JSON.stringify(val) ?? "";
    return str.length > 20 ? str.slice(0, 20) + "…" : str;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-mono font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 font-mono">
                    {truncate(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        This is a preview of what this step would output. Real data will vary based on your configuration.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  summary,
  status = "empty",
  BrandIcon,
  tileBg = "bg-muted",
  iconColor = "text-foreground/70",
  moduleName,
  moduleDescription,
  iteratorBadge,
}: ModuleConfigShellProps) {
  const [activeTab, setActiveTab] = React.useState<"configure" | "sample">("configure");
  const isTrigger = position === 1;
  const mod = getModule(moduleType);
  const displayName = moduleName ?? mod?.name ?? moduleType;
  const displayDescription = moduleDescription ?? mod?.description ?? "";

  // Reset to configure tab whenever card collapses
  React.useEffect(() => {
    if (!isExpanded) setActiveTab("configure");
  }, [isExpanded]);

  // Keyboard nav for tab row
  function handleTabKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveTab("configure");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveTab("sample");
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-colors",
        hasError ? "border-destructive/50" : "border-border",
      )}
    >
      {/* ── Collapsed header — the whole thing is a button ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left",
          "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isExpanded && "rounded-b-none",
        )}
        aria-expanded={isExpanded}
        aria-controls={`step-panel-${position}`}
      >
        {/* Brand tile */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tileBg,
          )}
        >
          {BrandIcon ? (
            <BrandIcon className={cn("h-4 w-4", iconColor)} />
          ) : null}
        </div>

        {/* Role badge + name/summary */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* WHEN / THEN badge */}
            <span
              className={cn(
                "shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground",
              )}
            >
              {isTrigger ? "WHEN" : "THEN"}
            </span>

            {/* Module name · summary */}
            <p className="min-w-0 truncate text-sm">
              <span className="font-medium">{displayName}</span>
              {summary && (
                <span className="ml-1.5 text-muted-foreground">· {summary}</span>
              )}
            </p>

            {/* Agent C — iterator badge: appears after name/summary when upstream outputs array */}
            {iteratorBadge}
          </div>
        </div>

        {/* Right controls — stop propagation so individual buttons don't toggle expand */}
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
          // Allow keyboard events to propagate normally (enter/space on these elements is intentional)
        >
          {/* Status pill */}
          <StatusPill status={status} />

          {/* Chevron — aria-hidden since the button itself has aria-expanded */}
          <span
            aria-hidden="true"
            onClick={onToggleExpand}
            className="cursor-pointer rounded-md p-1.5 hover:bg-muted"
          >
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180",
              )}
            />
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

          {/* Drag handle rendered here */}
          {dragHandle}
        </div>
      </button>

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <div
          id={`step-panel-${position}`}
          className="border-t border-border px-4 pb-4 pt-3"
        >
          {/* B.2 — "What this does" panel */}
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-muted/30 p-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                tileBg,
              )}
            >
              {BrandIcon ? (
                <BrandIcon className={cn("h-4 w-4", iconColor)} />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayDescription}</p>
            </div>
          </div>

          {/* B.3 — Configure + Sample tabs */}
          <div role="tablist" onKeyDown={handleTabKeyDown} className="mb-4 flex gap-1 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "configure"}
              aria-controls={`step-${position}-configure-panel`}
              id={`step-${position}-configure-tab`}
              onClick={() => setActiveTab("configure")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === "configure"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Configure
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "sample"}
              aria-controls={`step-${position}-sample-panel`}
              id={`step-${position}-sample-tab`}
              onClick={() => setActiveTab("sample")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === "sample"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sample
            </button>
          </div>

          {/* Tab panels */}
          <div
            id={`step-${position}-configure-panel`}
            role="tabpanel"
            aria-labelledby={`step-${position}-configure-tab`}
            hidden={activeTab !== "configure"}
          >
            {activeTab === "configure" && children}
          </div>
          <div
            id={`step-${position}-sample-panel`}
            role="tabpanel"
            aria-labelledby={`step-${position}-sample-tab`}
            hidden={activeTab !== "sample"}
          >
            {activeTab === "sample" && <SampleTab moduleType={moduleType} />}
          </div>
        </div>
      )}
    </div>
  );
}
