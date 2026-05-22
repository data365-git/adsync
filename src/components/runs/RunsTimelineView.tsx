"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { RunStatusBadge } from "~/components/runs/RunStatusBadge";
import { RunsEmptyState } from "~/components/runs/RunsEmptyState";
import type { Run } from "~/server/mocks/types";

const STATUS_CLASS: Record<Run["status"], string> = {
  queued: "bg-amber-400",
  running: "bg-amber-500",
  success: "bg-green-500",
  failed: "bg-red-500",
};

function getRunEnd(run: Run): number {
  if (run.finishedAt) return run.finishedAt.getTime();
  if (run.durationMs !== null) return run.startedAt.getTime() + run.durationMs;
  return run.startedAt.getTime() + 60_000;
}

export function RunsTimelineView({
  runs,
  isLoading,
  isError,
  hasFilters,
  onRetry,
  onClearFilters,
}: {
  runs: Run[];
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
}) {
  if (isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
      >
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-red-600"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-700">
            Failed to load timeline
          </p>
          <p className="mt-1 text-sm text-red-700/90">
            Something went wrong. Please try again.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[10rem_1fr] gap-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <RunsEmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />
      </div>
    );
  }

  const minTime = Math.min(...runs.map((run) => run.startedAt.getTime()));
  const maxTime = Math.max(...runs.map(getRunEnd));
  const span = Math.max(1, maxTime - minTime);
  const grouped = Array.from(
    runs.reduce((map, run) => {
      const key = run.scenarioName ?? run.scenarioId;
      const list = map.get(key) ?? [];
      list.push(run);
      map.set(key, list);
      return map;
    }, new Map<string, Run[]>()),
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[10rem_1fr] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium tracking-[0.04em] text-slate-500 uppercase">
        <span>Scenario</span>
        <span>Run duration</span>
      </div>
      <div className="divide-y divide-slate-100">
        {grouped.map(([scenario, scenarioRuns]) => (
          <div
            key={scenario}
            className="grid min-h-16 grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[10rem_1fr]"
          >
            <div className="min-w-0 text-sm text-slate-700">
              <span className="block truncate" title={scenario}>
                {scenario}
              </span>
              <span className="text-xs text-slate-500">
                {scenarioRuns.length} runs
              </span>
            </div>
            <div className="relative h-10 rounded-md bg-slate-50">
              {scenarioRuns.map((run) => {
                const left = ((run.startedAt.getTime() - minTime) / span) * 100;
                const width = Math.max(
                  1.5,
                  ((getRunEnd(run) - run.startedAt.getTime()) / span) * 100,
                );
                return (
                  <Link
                    key={run.id}
                    href={`/runs/${run.id}`}
                    aria-label={`View ${run.status} run from ${format(run.startedAt, "PP p")}`}
                    title={`${format(run.startedAt, "PP p")} - ${run.status}`}
                    className={`absolute top-2 h-6 rounded-sm ${STATUS_CLASS[run.status]} focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="sr-only">{run.status}</span>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 md:col-start-2">
              {(["success", "failed", "running", "queued"] as const).map(
                (status) => (
                  <RunStatusBadge key={status} status={status} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
