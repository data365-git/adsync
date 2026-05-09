"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { RunStatusBadge } from "~/components/runs/RunStatusBadge";
import type { Run } from "~/server/mocks/types";
import { MOCK_AD_ACCOUNTS } from "~/server/mocks/data";

interface RunDetailHeaderProps {
  run: Run;
}

export function RunDetailHeader({ run }: RunDetailHeaderProps) {
  const account = MOCK_AD_ACCOUNTS.find((a) => a.id === run.adAccountId);
  const accountName = account?.label ?? run.adAccountId;
  const shortId = run.id.replace("run_", "#");

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            {/* Hard href — works after page refresh / direct navigation */}
            <Link
              href="/runs"
              className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Runs
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="font-medium text-foreground" aria-current="page">
            Run {shortId}
          </li>
        </ol>
      </nav>

      {/* Title row */}
      <div className="flex flex-wrap items-start gap-3 sm:items-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Run {shortId}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <RunStatusBadge status={run.status} pulse={run.status === "running"} />
          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
            {run.trigger}
          </span>
        </div>
      </div>

      {/* Account subtitle */}
      <p className="text-sm text-muted-foreground">
        Ad account:{" "}
        <span className="font-medium text-foreground">{accountName}</span>
      </p>
    </div>
  );
}
