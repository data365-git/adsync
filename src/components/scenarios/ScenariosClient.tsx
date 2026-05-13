"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import type { Scenario } from "~/server/mocks/types";
import { QuickSetupBanner } from "./QuickSetupBanner";
import { ScenarioRow } from "./ScenarioRow";
import { ScenarioCard } from "./ScenarioCard";
import { ScenariosEmptyState } from "./ScenariosEmptyState";

/**
 * URL param: ?show=quick → include QUICK_SETUP scenarios in the list.
 * Default: hidden (user focuses on custom scenarios).
 * Persists across reloads via nuqs.
 */
const showParser = parseAsStringLiteral(["quick"] as const);

export function ScenariosClient() {
  // URL filter — persists across reloads
  const [show, setShow] = useQueryState("show", showParser);
  const includeQuickSetup = show === "quick";

  // Optimistic list for immediate UI feedback on duplicate/delete
  const [optimisticScenarios, setOptimisticScenarios] = useState<
    Scenario[] | null
  >(null);

  const { data, isLoading, isError, refetch, isFetching } =
    api.scenarios.list.useQuery({ includeQuickSetup });

  // Sync optimistic state with server state after a refetch completes
  useEffect(() => {
    if (data !== undefined) {
      setOptimisticScenarios(null);
    }
  }, [data]);

  const runCounts = api.scenarios.runCounts.useQuery();

  const scenarios = optimisticScenarios ?? data ?? [];
  const runCountMap: Record<string, number> = runCounts.data ?? {};

  // Filter: if show !== "quick", only show CUSTOM scenarios (server already filters,
  // but guard here too for optimistic list which may include both kinds).
  const filteredScenarios = includeQuickSetup
    ? scenarios
    : scenarios.filter((s) => s.kind !== "QUICK_SETUP");

  const hasFilters = includeQuickSetup;
  // "filters applied with zero results" vs "no data at all"
  const isFilteredEmpty =
    !isLoading && filteredScenarios.length === 0 && (data?.length ?? 0) > 0;
  const isAbsolutelyEmpty = !isLoading && (data?.length ?? 0) === 0;

  const handleDuplicated = useCallback(
    (newScenario: Scenario) => {
      const base = optimisticScenarios ?? data ?? [];
      setOptimisticScenarios([...base, newScenario]);
    },
    [optimisticScenarios, data],
  );

  const handleDeleted = useCallback(
    (id: string) => {
      const base = optimisticScenarios ?? data ?? [];
      setOptimisticScenarios(base.filter((s) => s.id !== id));
    },
    [optimisticScenarios, data],
  );

  const handleClearFilters = useCallback(() => {
    void setShow(null);
  }, [setShow]);

  const handleToggleQuick = useCallback(
    (checked: boolean) => {
      void setShow(checked ? "quick" : null);
    },
    [setShow],
  );

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <QuickSetupBanner />
        {/* Filter bar skeleton */}
        <div className="flex h-6 items-center gap-2 motion-safe:animate-pulse motion-reduce:opacity-70">
          <div className="bg-muted h-4 w-8 rounded-full" />
          <div className="bg-muted h-4 w-36 rounded" />
        </div>
        {/* Desktop skeleton */}
        <div className="hidden rounded-xl border md:block">
          <Table aria-label="Scenarios">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="sr-only w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map((i) => (
                <TableRow key={i} className="h-18">
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      <div className="bg-muted h-4 w-44 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
                      <div className="bg-muted h-3 w-16 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="bg-muted h-5 w-16 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
                  </td>
                  <td className="p-2">
                    <div className="bg-muted h-[18px] w-8 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      <div className="bg-muted h-3.5 w-16 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
                      <div className="bg-muted h-5 w-20 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="bg-muted h-8 w-8 rounded-lg motion-safe:animate-pulse motion-reduce:opacity-70" />
                  </td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Mobile skeleton */}
        <div className="flex flex-col gap-4 md:hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex h-[220px] flex-col gap-4 rounded-xl border p-6 motion-safe:animate-pulse motion-reduce:opacity-70"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="bg-muted h-4 w-36 rounded" />
                  <div className="bg-muted h-5 w-16 rounded-full" />
                </div>
                <div className="bg-muted h-11 w-11 shrink-0 rounded-lg" />
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-muted h-3.5 w-14 rounded" />
                <div className="flex flex-col gap-1">
                  <div className="bg-muted h-3.5 w-16 rounded" />
                  <div className="bg-muted h-5 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <div className="bg-muted h-[18px] w-16 rounded-full" />
                <div className="bg-muted h-11 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <QuickSetupBanner />
        <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-4 rounded-xl border py-16 text-center">
          <AlertCircle className="text-destructive size-8" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Failed to load scenarios</p>
            <p className="text-muted-foreground text-sm">
              Check your connection and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "motion-safe:animate-spin" : ""}`}
              aria-hidden
            />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // --- Empty state (no data at all) ---
  if (isAbsolutelyEmpty) {
    return (
      <div className="flex flex-col gap-4">
        <QuickSetupBanner />
        <ScenariosEmptyState hasFilters={false} />
      </div>
    );
  }

  // --- Empty state (filters applied, zero results) ---
  if (isFilteredEmpty) {
    return (
      <div className="flex flex-col gap-4">
        <QuickSetupBanner />
        {/* Filter bar */}
        <FilterBar
          includeQuickSetup={includeQuickSetup}
          onToggle={handleToggleQuick}
        />
        <ScenariosEmptyState
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
        />
      </div>
    );
  }

  // --- Success state ---
  return (
    <div className="flex flex-col gap-4">
      <QuickSetupBanner />

      {/* Filter bar */}
      <FilterBar
        includeQuickSetup={includeQuickSetup}
        onToggle={handleToggleQuick}
      />

      {/* Desktop table */}
      <div className="hidden rounded-xl border md:block">
        <Table aria-label="Scenarios">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="sr-only w-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredScenarios.map((scenario) => (
              <ScenarioRow
                key={scenario.id}
                scenario={scenario}
                runCount={runCountMap[scenario.id]}
                onDuplicated={handleDuplicated}
                onDeleted={handleDeleted}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-4 md:hidden">
        {filteredScenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            runCount={runCountMap[scenario.id]}
            onDuplicated={handleDuplicated}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}

function FilterBar({
  includeQuickSetup,
  onToggle,
}: {
  includeQuickSetup: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={includeQuickSetup}
        onCheckedChange={onToggle}
        size="sm"
        aria-label="Show Quick Setup scenarios"
      />
      {/* Clicking the span label also toggles via the switch's own click area */}
      <span className="text-muted-foreground text-sm select-none">
        Show Quick Setup scenarios
      </span>
    </div>
  );
}
