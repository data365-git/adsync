"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
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

const TRIGGER_LABEL: Record<Run["trigger"], string> = {
  manual: "Manual",
  scheduled: "Scheduled",
};

function formatRowsWritten(
  campaignRowsWritten: number | null,
  adRowsWritten: number | null,
): string {
  if (campaignRowsWritten === null && adRowsWritten === null) return "-";
  const parts: string[] = [];
  if (campaignRowsWritten !== null) parts.push(`${campaignRowsWritten}C`);
  if (adRowsWritten !== null) parts.push(`${adRowsWritten}A`);
  return parts.join(" / ");
}

const ERROR_CHAR_LIMIT = 40;

function truncateError(msg: string): { text: string; truncated: boolean } {
  if (msg.length <= ERROR_CHAR_LIMIT) return { text: msg, truncated: false };
  return { text: `${msg.slice(0, ERROR_CHAR_LIMIT)}...`, truncated: true };
}

interface RunRowProps {
  run: Run;
}

export function RunRow({ run }: RunRowProps) {
  const accountLabel = run.adAccountLabel ?? run.adAccountFbId ?? run.adAccountId;
  const scenarioName = run.scenarioName ?? run.scenarioId;
  const isQuickSetup = run.scenarioKind === "QUICK_SETUP";

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
      className="h-[52px] cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-within:bg-slate-50"
      aria-label={`Run ${run.id} - ${accountLabel} - ${TRIGGER_LABEL[run.trigger]} - ${run.status}`}
    >
      <TableCell className="py-3 pl-5 pr-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="rounded underline decoration-slate-300 decoration-dashed underline-offset-2 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none">
              <time
                dateTime={run.startedAt.toISOString()}
                className="text-sm text-slate-700"
              >
                {relativeTime}
              </time>
            </TooltipTrigger>
            <TooltipContent side="top">{absoluteTime}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/scenarios/${run.scenarioId}`}
            className="max-w-[12rem] truncate rounded text-sm text-slate-900 hover:underline focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
            title={scenarioName}
          >
            {scenarioName}
          </Link>
          {isQuickSetup ? (
            <span className="inline-flex shrink-0 items-center rounded-sm bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium tracking-[0.04em] text-sky-700 uppercase">
              Quick
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="px-4 py-3">
        <span className="max-w-[10rem] truncate text-sm text-slate-700" title={accountLabel}>
          {accountLabel}
        </span>
      </TableCell>

      <TableCell className="px-4 py-3">
        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
          {TRIGGER_LABEL[run.trigger]}
        </span>
      </TableCell>

      <TableCell className="px-4 py-3">
        <RunStatusBadge
          status={run.status}
          pulse={isRunning}
          timeLabel={relativeTime}
        />
      </TableCell>

      <TableCell className="hidden px-4 py-3 md:table-cell">
        <span className="text-sm tabular-nums text-slate-700">{rowsWritten}</span>
      </TableCell>

      <TableCell className="hidden px-4 py-3 md:table-cell">
        <span className="text-sm tabular-nums text-slate-500">
          {formatDuration(run.durationMs)}
        </span>
      </TableCell>

      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-2">
          {errorPreview != null ? (
            errorPreview.truncated ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="max-w-[10rem] overflow-hidden rounded text-xs text-ellipsis whitespace-nowrap text-red-700 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none">
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
              <span className="text-xs text-red-700">{errorPreview.text}</span>
            )
          ) : null}

          <Link
            href={`/runs/${run.id}`}
            className="ml-auto shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
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
