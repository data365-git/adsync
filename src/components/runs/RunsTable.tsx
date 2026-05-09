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
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <AlertCircle
          className="size-10 text-destructive"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-foreground">Failed to load runs</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong. Please try again.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Table aria-label="Sync runs" aria-busy={isLoading}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>When</TableHead>
            <TableHead>Scenario</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            {/* These columns collapse on mobile */}
            <TableHead className="hidden md:table-cell">Rows Written</TableHead>
            <TableHead className="hidden md:table-cell">Duration</TableHead>
            {/* Error / link column — always visible */}
            <TableHead>
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow key={i} aria-hidden="true">
                {/* When */}
                <td className="p-2">
                  <Skeleton className="h-5 w-24" />
                </td>
                {/* Scenario */}
                <td className="p-2">
                  <Skeleton className="h-5 w-36" />
                </td>
                {/* Account */}
                <td className="p-2">
                  <Skeleton className="h-5 w-32" />
                </td>
                {/* Trigger */}
                <td className="p-2">
                  <Skeleton className="h-5 w-20" />
                </td>
                {/* Status */}
                <td className="p-2">
                  <Skeleton className="h-5 w-16" />
                </td>
                {/* Rows Written — hidden mobile */}
                <td className="hidden p-2 md:table-cell">
                  <Skeleton className="h-5 w-16" />
                </td>
                {/* Duration — hidden mobile */}
                <td className="hidden p-2 md:table-cell">
                  <Skeleton className="h-5 w-12" />
                </td>
                {/* Link */}
                <td className="p-2">
                  <Skeleton className="h-5 w-5" />
                </td>
              </TableRow>
            ))
          ) : runs.length === 0 ? (
            <tr>
              <td colSpan={8}>
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
