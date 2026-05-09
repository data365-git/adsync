"use client";

import * as React from "react";
import { CheckCircle2Icon, XCircleIcon, XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { formatDuration } from "~/lib/utils";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";

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

export function TestRunPanel({
  results,
  stepModuleTypes,
  isLoading,
  onClose,
}: TestRunPanelProps) {
  const allSuccess = results.every((r) => r.status === "success");

  return (
    <div
      className="mt-4 rounded-xl border border-border bg-card"
      aria-live="polite"
      aria-label="Test run results"
      aria-busy={isLoading}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Test run results</p>
          {!isLoading && results.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                allSuccess
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {allSuccess ? "All passed" : "Some failed"}
            </span>
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

      {/* Results */}
      <div className="divide-y divide-border">
        {isLoading ? (
          // Skeleton rows
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="size-4 rounded-full bg-muted" />
                <div className="h-3.5 w-32 rounded bg-muted" />
                <div className="ml-auto h-3.5 w-12 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No results yet.</p>
        ) : (
          results.map((result, idx) => {
            const moduleType = stepModuleTypes[idx];
            const mod = moduleType ? getModule(moduleType) : undefined;

            return (
              <details key={result.stepId} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  {result.status === "success" ? (
                    <CheckCircle2Icon className="size-4 shrink-0 text-green-500" aria-label="Success" />
                  ) : (
                    <XCircleIcon className="size-4 shrink-0 text-red-500" aria-label="Failed" />
                  )}
                  <span className="flex-1 text-sm">
                    <span className="text-muted-foreground">Step {idx + 1} — </span>
                    <span className="font-medium">{mod?.name ?? moduleType}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {formatDuration(result.durationMs)}
                  </span>
                  <svg
                    className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </summary>

                {/* Output JSON */}
                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground/80">
                    {JSON.stringify(result.output, null, 2)}
                  </pre>
                </div>
              </details>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!isLoading && results.length > 0 && (
        <div className="border-t border-border px-4 py-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close test results
          </Button>
        </div>
      )}
    </div>
  );
}
