"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  RefreshCwIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { formatDuration } from "~/lib/utils";
import { getModule } from "~/lib/modules";
import { getIntegrationMeta } from "~/lib/integration-icons";
import type { ModuleType } from "~/server/mocks/types";
import { moduleProducesArray, moduleSampleOutputLength } from "./stepUtils";

type TestStepResult = {
  stepId: string;
  status: "success" | "failed";
  output: Record<string, unknown>;
  durationMs: number;
};

interface TestRunPanelProps {
  results: TestStepResult[];
  stepModuleTypes: ModuleType[];
  isLoading: boolean;
  onClose: () => void;
}

// Derive a compact output table from a result's output object.
// We show at most 5 columns from the first-level keys.
function outputTableRows(
  output: Record<string, unknown>,
): Array<[string, string]> {
  const entries = Object.entries(output).slice(0, 5);
  return entries.map(([k, v]) => [
    k,
    typeof v === "object" && v !== null ? JSON.stringify(v) : String(v),
  ]);
}

// ─── DockHeader ──────────────────────────────────────────────────────────────

interface DockHeaderProps {
  results: TestStepResult[];
  isLoading: boolean;
  onClose: () => void;
}

function DockHeader({ results, isLoading, onClose }: DockHeaderProps) {
  const succeeded = results.filter((r) => r.status === "success").length;
  const total = results.length;
  const totalMs = results.reduce((acc, r) => acc + r.durationMs, 0);

  return (
    <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-2.5">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">Test results</p>
        {!isLoading && total > 0 && (
          <span className="text-muted-foreground text-xs">
            {succeeded} of {total} step{total !== 1 ? "s" : ""} succeeded ·{" "}
            {formatDuration(totalMs)} total
          </span>
        )}
        {isLoading && (
          <span className="text-muted-foreground text-xs">Running…</span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Close test results"
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );
}

// ─── DockBody ────────────────────────────────────────────────────────────────

interface DockBodyProps {
  results: TestStepResult[];
  stepModuleTypes: ModuleType[];
  isLoading: boolean;
}

function DockBody({ results, stepModuleTypes, isLoading }: DockBodyProps) {
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);

  function toggleRow(idx: number) {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  }

  if (isLoading) {
    return (
      <div className="divide-border flex-1 divide-y overflow-y-auto">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 motion-safe:animate-pulse motion-reduce:opacity-70"
          >
            <div className="bg-muted size-7 rounded-lg" />
            <div className="bg-muted h-3.5 w-32 rounded" />
            <div className="bg-muted ml-auto h-3.5 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">No results yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-border flex-1 divide-y overflow-y-auto">
      {results.map((result, idx) => {
        const moduleType = stepModuleTypes[idx];
        const mod = moduleType ? getModule(moduleType) : undefined;
        const meta = moduleType ? getIntegrationMeta(moduleType) : null;
        const isExpanded = expandedIdx === idx;
        const tableRows = outputTableRows(result.output);

        // Agent C — iterator copy: check if the immediately-upstream step outputs an array
        const prevModuleType = idx > 0 ? stepModuleTypes[idx - 1] : undefined;
        const upstreamProducesArray =
          prevModuleType !== undefined && moduleProducesArray(prevModuleType);
        const upstreamRunCount =
          prevModuleType !== undefined
            ? moduleSampleOutputLength(prevModuleType)
            : undefined;
        const prevModName = prevModuleType
          ? (getModule(prevModuleType)?.shortName ?? prevModuleType)
          : undefined;

        return (
          <div key={result.stepId}>
            {/* Agent C — iterator context block: slate left-border above the result row */}
            {upstreamProducesArray && (
              <div className="mx-4 mt-2 mb-1 flex items-start gap-2 rounded-md border-l-2 border-slate-300 bg-slate-50 py-2 pr-3 pl-3 dark:border-slate-600 dark:bg-slate-900/40">
                <RefreshCwIcon
                  className="mt-0.5 size-3.5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-medium">
                    Iterates per item from Step {idx} ({prevModName})
                  </p>
                  {upstreamRunCount !== undefined && (
                    <p>
                      Will run {upstreamRunCount} times during a real execution
                    </p>
                  )}
                  <p className="text-slate-500 dark:text-slate-400">
                    Showing result for first item (item[0]) below
                  </p>
                </div>
              </div>
            )}

            {/* Step row */}
            <button
              type="button"
              onClick={() => toggleRow(idx)}
              className="hover:bg-muted/50 focus-visible:ring-ring flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
              aria-expanded={isExpanded}
              aria-label={`Step ${idx + 1}: ${mod?.name ?? moduleType ?? "Unknown"} — ${result.status}`}
            >
              {/* Integration tile */}
              {meta ? (
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    meta.tileBg,
                  )}
                  aria-hidden="true"
                >
                  <meta.Icon className={cn("size-3.5", meta.iconColor)} />
                </span>
              ) : (
                <span
                  className="bg-muted size-7 shrink-0 rounded-lg"
                  aria-hidden="true"
                />
              )}

              {/* Module name */}
              <span className="flex-1 text-left text-sm">
                <span className="text-muted-foreground">Step {idx + 1} — </span>
                <span className="font-medium">{mod?.name ?? moduleType}</span>
              </span>

              {/* Duration badge */}
              <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 font-mono text-xs">
                {formatDuration(result.durationMs)}
              </span>

              {/* Status icon */}
              {result.status === "success" ? (
                <CheckCircle2Icon
                  className="size-4 shrink-0 text-green-500"
                  aria-label="Success"
                />
              ) : (
                <XCircleIcon
                  className="size-4 shrink-0 text-red-500"
                  aria-label="Failed"
                />
              )}
            </button>

            {/* Inline detail table — 3-row x ≤5-col output */}
            {isExpanded && tableRows.length > 0 && (
              <div className="border-border bg-muted/30 border-t px-4 py-3">
                <table
                  className="w-full min-w-0 text-xs"
                  aria-label={`Output for step ${idx + 1}`}
                >
                  <thead>
                    <tr>
                      {tableRows.map(([key]) => (
                        <th
                          key={key}
                          className="text-muted-foreground pr-3 pb-1 text-left font-medium"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {tableRows.map(([key, val]) => (
                        <td
                          key={key}
                          className="max-w-[160px] truncate pr-3 font-mono"
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TestRunPanel (sliding bottom dock) ──────────────────────────────────────

export function TestRunPanel({
  results,
  stepModuleTypes,
  isLoading,
  onClose,
}: TestRunPanelProps) {
  const isOpen = true; // Controlled by parent via mount/unmount; opened when rendered

  // Esc key dismissal
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="region"
      aria-label="Test results"
      aria-live="polite"
      aria-busy={isLoading}
      className={cn(
        "fixed right-0 bottom-0 left-[var(--sidebar-width,16rem)] z-30",
        "bg-background border-border flex flex-col border-t shadow-lg",
        "h-[280px]",
        // Slide-in transition; respect prefers-reduced-motion
        "motion-reduce:transition-opacity motion-reduce:duration-150",
        isOpen
          ? "translate-y-0 transition-transform duration-200 motion-reduce:opacity-100"
          : "translate-y-full motion-reduce:opacity-0",
      )}
    >
      <DockHeader results={results} isLoading={isLoading} onClose={onClose} />
      <DockBody
        results={results}
        stepModuleTypes={stepModuleTypes}
        isLoading={isLoading}
      />
    </div>
  );
}
