"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { RunsFilters } from "~/components/runs/RunsFilters";
import { RunsPagination } from "~/components/runs/RunsPagination";
import { RunsTable } from "~/components/runs/RunsTable";

type FilterStatus = "success" | "failed" | "running" | "cancelled";

const PAGE_SIZE = 10;

export function RunsClient() {
  const [page, setPage] = React.useState(1);
  const [scenarioIds, setScenarioIds] = React.useState<string[]>([]);
  const [adAccountId, setAdAccountId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<FilterStatus | null>(null);
  const [from, setFrom] = React.useState<Date | null>(null);
  const [to, setTo] = React.useState<Date | null>(null);
  const [minDurationMs, setMinDurationMs] = React.useState<number | null>(null);

  const query = api.runs.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    ...(scenarioIds.length > 0 && { scenarioIds }),
    ...(adAccountId && { adAccountId }),
    ...(status && { status }),
    ...(from && { from }),
    ...(to && { to }),
    ...(minDurationMs !== null && { minDurationMs }),
  });

  const hasFilters =
    scenarioIds.length > 0 ||
    adAccountId !== null ||
    status !== null ||
    from !== null ||
    to !== null ||
    minDurationMs !== null;

  const clearFilters = () => {
    setScenarioIds([]);
    setAdAccountId(null);
    setStatus(null);
    setFrom(null);
    setTo(null);
    setMinDurationMs(null);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <RunsFilters
        scenarioIds={scenarioIds}
        adAccountId={adAccountId}
        status={status}
        from={from}
        to={to}
        minDurationMs={minDurationMs}
        onScenarioIdsChange={(ids) => {
          setScenarioIds(ids);
          setPage(1);
        }}
        onAdAccountIdChange={(id) => {
          setAdAccountId(id);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onFromChange={(value) => {
          setFrom(value);
          setPage(1);
        }}
        onToChange={(value) => {
          setTo(value);
          setPage(1);
        }}
        onMinDurationMsChange={(value) => {
          setMinDurationMs(value);
          setPage(1);
        }}
        onClearAll={clearFilters}
      />
      <RunsTable
        runs={query.data?.runs ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
        hasFilters={hasFilters}
        onRetry={() => void query.refetch()}
        onClearFilters={clearFilters}
      />
      <RunsPagination
        page={query.data?.page ?? page}
        totalPages={query.data?.totalPages ?? 1}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
