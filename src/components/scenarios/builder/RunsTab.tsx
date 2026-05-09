"use client";

import * as React from "react";
import Link from "next/link";
import { formatDuration } from "~/lib/utils";
import { getStatusLabel } from "~/lib/utils";
import type { Run } from "~/server/mocks/types";

interface RunsTabProps {
  runs: Run[];
  scenarioId: string;
}

const PAGE_SIZE = 10;

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: Run["status"] }) {
  const colorMap: Record<Run["status"], string> = {
    queued: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    running: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    success: "bg-green-500/10 text-green-600 border-green-500/30",
    failed: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

export function RunsTab({ runs, scenarioId }: RunsTabProps) {
  const [page, setPage] = React.useState(1);

  const filteredRuns = runs.filter((r) => r.scenarioId === scenarioId);
  const totalPages = Math.ceil(filteredRuns.length / PAGE_SIZE);
  const pageRuns = filteredRuns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (filteredRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-foreground">No runs yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No runs for this scenario yet. Use the Test or Run Now button to start.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Run rows */}
      <div
        className="overflow-hidden rounded-xl border border-border"
        role="table"
        aria-label="Run history"
      >
        {/* Header */}
        <div
          className="hidden grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid"
          role="row"
        >
          <span role="columnheader">Trigger</span>
          <span role="columnheader">Started</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Duration</span>
          <span role="columnheader">Details</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {pageRuns.map((run) => (
            <div
              key={run.id}
              className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-center sm:gap-4"
              role="row"
            >
              <span
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize"
                role="cell"
              >
                {run.trigger}
              </span>
              <span className="text-xs text-muted-foreground" role="cell">
                {formatDate(run.startedAt)}
              </span>
              <span role="cell">
                <StatusBadge status={run.status} />
              </span>
              <span className="font-mono text-xs text-muted-foreground" role="cell">
                {formatDuration(run.durationMs)}
              </span>
              <Link
                href={`/runs/${run.id}`}
                className="text-xs text-primary underline-offset-3 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="cell"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-muted-foreground">
            {filteredRuns.length} run{filteredRuns.length !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md px-2 py-1 text-xs hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="px-2 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md px-2 py-1 text-xs hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
