"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs";
import { api } from "~/trpc/react";
import type { RunStatus } from "~/server/mocks/types";
import { RunsFilters } from "~/components/runs/RunsFilters";
import { RunsTable } from "~/components/runs/RunsTable";
import { RunsPagination } from "~/components/runs/RunsPagination";

/** Write URL immediately on filter change, but debounce the actual fetch by 150ms. */
const FETCH_DEBOUNCE_MS = 150;

export function RunsClient() {
  // --- URL params (nuqs) — written immediately ---
  const [accountIds, setAccountIds] = useQueryState(
    "account",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [statuses, setStatuses] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  );

  // --- Debounced fetch params — lag behind URL by 150ms ---
  const [fetchAccountIds, setFetchAccountIds] = useState<string[]>(accountIds);
  const [fetchStatuses, setFetchStatuses] = useState<string[]>(statuses);
  const [fetchPage, setFetchPage] = useState<number>(page);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFetchAccountIds(accountIds);
      setFetchStatuses(statuses);
      setFetchPage(page);
    }, FETCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [accountIds, statuses, page]);

  // --- tRPC query using debounced params ---
  const validStatuses = fetchStatuses.filter(
    (s): s is RunStatus =>
      s === "queued" || s === "running" || s === "success" || s === "failed",
  );

  const { data, isLoading, isError, refetch } = api.runs.list.useQuery({
    accountIds: fetchAccountIds.length > 0 ? fetchAccountIds : undefined,
    statuses: validStatuses.length > 0 ? validStatuses : undefined,
    page: fetchPage,
    pageSize: 10,
  });

  // --- Filter handlers ---
  function handleAccountIdsChange(ids: string[]) {
    void setAccountIds(ids.length > 0 ? ids : null);
    void setPage(1);
  }

  function handleStatusesChange(next: RunStatus[]) {
    void setStatuses(next.length > 0 ? next : null);
    void setPage(1);
  }

  function handleClearAll() {
    void setAccountIds(null);
    void setStatuses(null);
    void setPage(1);
  }

  function handlePageChange(next: number) {
    void setPage(next);
  }

  const hasFilters = accountIds.length > 0 || statuses.length > 0;

  return (
    <section aria-label="Sync runs history" className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2">
        <RunsFilters
          accountIds={accountIds}
          statuses={validStatuses}
          onAccountIdsChange={handleAccountIdsChange}
          onStatusesChange={handleStatusesChange}
          onClearAll={handleClearAll}
        />
      </div>

      {/* Table */}
      <RunsTable
        runs={data?.runs ?? []}
        isLoading={isLoading}
        isError={isError}
        hasFilters={hasFilters}
        onRetry={() => void refetch()}
        onClearFilters={handleClearAll}
      />

      {/* Pagination */}
      {!isLoading && !isError && (
        <RunsPagination
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          total={data?.total ?? 0}
          onPageChange={handlePageChange}
        />
      )}
    </section>
  );
}
