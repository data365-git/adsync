"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { RunStatusBadge } from "~/components/runs/RunStatusBadge";
import type { Run } from "~/server/mocks/types";

interface RunDetailHeaderProps {
  run: Run;
}

export function RunDetailHeader({ run }: RunDetailHeaderProps) {
  const shortId = run.id.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-slate-500">
          <li>
            {/* Hard href — works after page refresh / direct navigation */}
            <Link
              href="/runs"
              className="rounded hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            >
              Runs
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="font-medium text-slate-900" aria-current="page">
            Run {shortId}
          </li>
        </ol>
      </nav>

      {/* Title row */}
      <div className="flex flex-wrap items-start gap-3 sm:items-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Run {shortId}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <RunStatusBadge status={run.status} pulse={run.status === "running"} />
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
            {run.trigger}
          </span>
        </div>
      </div>

    </div>
  );
}
