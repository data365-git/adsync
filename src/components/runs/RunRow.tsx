"use client";

import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { TableCell, TableRow } from "~/components/ui/table";
import { RunStatusBadge } from "~/components/runs/RunStatusBadge";
import { formatDuration } from "~/lib/utils";
import type { Run } from "~/server/mocks/types";
import { MOCK_AD_ACCOUNTS, MOCK_SCENARIOS } from "~/server/mocks/data";

const TRIGGER_LABEL: Record<Run["trigger"], string> = {
  manual: "Manual",
  scheduled: "Scheduled",
};

function formatRowsWritten(
  campaignRowsWritten: number | null,
  adRowsWritten: number | null,
): string {
  if (campaignRowsWritten === null && adRowsWritten === null) return "—";
  const parts: string[] = [];
  if (campaignRowsWritten !== null) parts.push(`${campaignRowsWritten}C`);
  if (adRowsWritten !== null) parts.push(`${adRowsWritten}A`);
  return parts.join(" / ");
}

const ERROR_CHAR_LIMIT = 40;

function truncateError(msg: string): { text: string; truncated: boolean } {
  if (msg.length <= ERROR_CHAR_LIMIT) return { text: msg, truncated: false };
  return { text: msg.slice(0, ERROR_CHAR_LIMIT) + "…", truncated: true };
}

interface RunRowProps {
  run: Run;
}

export function RunRow({ run }: RunRowProps) {
  const account = MOCK_AD_ACCOUNTS.find((a) => a.id === run.adAccountId);
  const accountLabel = account?.label ?? run.adAccountId;
  const scenario = MOCK_SCENARIOS.find((s) => s.id === run.scenarioId);
  const scenarioName = scenario?.name ?? run.scenarioId;
  const isQuickSetup = scenario?.kind === "QUICK_SETUP";

  const relativeTime = formatDistanceToNow(run.startedAt, { addSuffix: true });
  const absoluteTime = format(run.startedAt, "MMM d, yyyy 'at' h:mm:ss a");

  const rowsWritten = formatRowsWritten(
    run.campaignRowsWritten,
    run.adRowsWritten,
  );

  const isRunning = run.status === "running";

  const errorPreview =
    run.errorMessage != null ? truncateError(run.errorMessage) : null;

  return (
    <TableRow
      className="cursor-pointer focus-within:bg-muted/50"
      aria-label={`Run ${run.id} — ${accountLabel} — ${TRIGGER_LABEL[run.trigger]} — ${run.status}`}
    >
      {/* When */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="underline decoration-dashed decoration-muted-foreground underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <time dateTime={run.startedAt.toISOString()} className="text-sm">
                {relativeTime}
              </time>
            </TooltipTrigger>
            <TooltipContent side="top">{absoluteTime}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Scenario */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/scenarios/${run.scenarioId}`}
            className="max-w-[12rem] truncate text-sm text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            title={scenarioName}
          >
            {scenarioName}
          </Link>
          {isQuickSetup ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Quick
            </span>
          ) : null}
        </div>
      </TableCell>

      {/* Account */}
      <TableCell>
        <span className="max-w-[10rem] truncate text-sm" title={accountLabel}>
          {accountLabel}
        </span>
      </TableCell>

      {/* Trigger */}
      <TableCell>
        <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {TRIGGER_LABEL[run.trigger]}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <RunStatusBadge status={run.status} pulse={isRunning} />
      </TableCell>

      {/* Rows Written — hidden on mobile */}
      <TableCell className="hidden md:table-cell">
        <span className="text-sm tabular-nums">{rowsWritten}</span>
      </TableCell>

      {/* Duration — hidden on mobile */}
      <TableCell className="hidden md:table-cell">
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDuration(run.durationMs)}
        </span>
      </TableCell>

      {/* Error preview + detail link */}
      <TableCell>
        <div className="flex items-center gap-2">
          {errorPreview != null ? (
            errorPreview.truncated ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-status-failed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {errorPreview.text}
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs whitespace-normal"
                  >
                    {run.errorMessage}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs text-status-failed">
                {errorPreview.text}
              </span>
            )
          ) : null}

          <Link
            href={`/runs/${run.id}`}
            className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View details for run ${run.id}`}
            tabIndex={0}
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
