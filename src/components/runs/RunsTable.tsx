"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { RunRow } from "~/components/runs/RunRow";
import { RunsEmptyState } from "~/components/runs/RunsEmptyState";
import type { Run } from "~/server/mocks/types";

const SKELETON_ROW_COUNT = 8;
const headerClass =
  "text-xs font-medium uppercase tracking-[0.04em] text-slate-500";

interface RunsTableProps {
  runs: Run[];
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
}

export function RunsTable({
  runs,
  isLoading,
  isError,
  hasFilters,
  onRetry,
  onClearFilters,
}: RunsTableProps) {
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
            Failed to load runs
          </p>
          <p className="mt-1 text-sm text-red-700/90">
            Something went wrong. Please try again.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-9 gap-1.5 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Table aria-label="Sync runs" aria-busy={isLoading}>
        <TableHeader className="bg-slate-50">
          <TableRow className="h-10 border-b border-slate-200 hover:bg-transparent">
            <TableHead className={`${headerClass} pl-5`}>When</TableHead>
            <TableHead className={headerClass}>Scenario</TableHead>
            <TableHead className={headerClass}>Trigger</TableHead>
            <TableHead className={headerClass}>Status</TableHead>
            <TableHead className={`${headerClass} hidden md:table-cell`}>
              Rows Written
            </TableHead>
            <TableHead className={`${headerClass} hidden md:table-cell`}>
              Duration
            </TableHead>
            <TableHead className={headerClass}>
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow
                key={i}
                aria-hidden="true"
                className="h-[52px] border-b border-slate-100 hover:bg-transparent"
              >
                <td className="py-3 pl-5 pr-4">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-36" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16" />
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <Skeleton className="h-5 w-16" />
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <Skeleton className="h-5 w-12" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-5" />
                </td>
              </TableRow>
            ))
          ) : runs.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <RunsEmptyState
                  hasFilters={hasFilters}
                  onClearFilters={onClearFilters}
                />
              </td>
            </tr>
          ) : (
            runs.map((run) => <RunRow key={run.id} run={run} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
