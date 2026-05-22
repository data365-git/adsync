"use client";

import { ChevronDown, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

type FilterStatus = "success" | "failed" | "running" | "cancelled";

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
  { value: "cancelled", label: "Cancelled" },
];

type RunsFiltersProps = {
  scenarioIds: string[];
  adAccountId: string | null;
  status: FilterStatus | null;
  from: Date | null;
  to: Date | null;
  minDurationMs: number | null;
  onScenarioIdsChange: (ids: string[]) => void;
  onAdAccountIdChange: (id: string | null) => void;
  onStatusChange: (status: FilterStatus | null) => void;
  onFromChange: (date: Date | null) => void;
  onToChange: (date: Date | null) => void;
  onMinDurationMsChange: (value: number | null) => void;
  onClearAll: () => void;
};

function toInputDateTime(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

function fromInputDateTime(value: string): Date | null {
  return value ? new Date(value) : null;
}

export function RunsFilters({
  scenarioIds,
  adAccountId,
  status,
  from,
  to,
  minDurationMs,
  onScenarioIdsChange,
  onAdAccountIdChange,
  onStatusChange,
  onFromChange,
  onToChange,
  onMinDurationMsChange,
  onClearAll,
}: RunsFiltersProps) {
  const { data: adAccounts, isLoading: accountsLoading } =
    api.adAccounts.list.useQuery();
  const { data: scenarios, isLoading: scenariosLoading } =
    api.scenarios.list.useQuery({ scope: "all" });

  const hasActiveFilters =
    scenarioIds.length > 0 ||
    adAccountId !== null ||
    status !== null ||
    from !== null ||
    to !== null ||
    minDurationMs !== null;

  const accountLabel =
    adAccounts?.find((account) => account.id === adAccountId)?.label ??
    "Ad account";

  function toggleScenario(id: string) {
    onScenarioIdsChange(
      scenarioIds.includes(id)
        ? scenarioIds.filter((scenarioId) => scenarioId !== id)
        : [...scenarioIds, id],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label="Filter by scenario"
                className="h-9 gap-1.5 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
              />
            }
          >
            Scenarios
            {scenarioIds.length > 0 ? (
              <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {scenarioIds.length}
              </span>
            ) : null}
            <ChevronDown className="size-3.5 text-slate-500" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1" align="start">
            {scenariosLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
              </div>
            ) : !scenarios || scenarios.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-slate-500">No scenarios</p>
            ) : (
              <ul className="max-h-64 space-y-0.5 overflow-auto">
                {scenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                      <Checkbox
                        checked={scenarioIds.includes(scenario.id)}
                        onCheckedChange={() => toggleScenario(scenario.id)}
                        aria-label={scenario.name}
                      />
                      <span className="truncate">{scenario.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label="Filter by ad account"
                className="h-9 gap-1.5 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
              />
            }
          >
            {adAccountId ? accountLabel : "Ad account"}
            <ChevronDown className="size-3.5 text-slate-500" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            {accountsLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : !adAccounts || adAccounts.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-slate-500">
                No ad accounts connected
              </p>
            ) : (
              <ul className="space-y-0.5">
                {adAccounts.map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => onAdAccountIdChange(account.id)}
                      className="min-h-9 w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {account.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label="Filter by status"
                className="h-9 gap-1.5 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
              />
            }
          >
            {status ? STATUS_OPTIONS.find((option) => option.value === status)?.label : "Status"}
            <ChevronDown className="size-3.5 text-slate-500" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="start">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className="min-h-9 w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                {option.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Input
          type="datetime-local"
          aria-label="From date"
          value={toInputDateTime(from)}
          onChange={(event) => onFromChange(fromInputDateTime(event.target.value))}
          className="h-9 w-48"
        />
        <Input
          type="datetime-local"
          aria-label="To date"
          value={toInputDateTime(to)}
          onChange={(event) => onToChange(fromInputDateTime(event.target.value))}
          className="h-9 w-48"
        />
        <Input
          type="number"
          min={0}
          aria-label="Minimum duration milliseconds"
          placeholder="Min ms"
          value={minDurationMs ?? ""}
          onChange={(event) =>
            onMinDurationMsChange(
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className="h-9 w-28"
        />

        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-9">
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {scenarioIds.map((id) => (
            <FilterChip
              key={id}
              label={`Scenario: ${
                scenarios?.find((scenario) => scenario.id === id)?.name ?? id
              }`}
              onClear={() =>
                onScenarioIdsChange(
                  scenarioIds.filter((scenarioId) => scenarioId !== id),
                )
              }
            />
          ))}
          {adAccountId ? (
            <FilterChip label={`Account: ${accountLabel}`} onClear={() => onAdAccountIdChange(null)} />
          ) : null}
          {status ? (
            <FilterChip label={`Status: ${status}`} onClear={() => onStatusChange(null)} />
          ) : null}
          {from ? (
            <FilterChip label={`From: ${from.toLocaleString()}`} onClear={() => onFromChange(null)} />
          ) : null}
          {to ? (
            <FilterChip label={`To: ${to.toLocaleString()}`} onClear={() => onToChange(null)} />
          ) : null}
          {minDurationMs !== null ? (
            <FilterChip
              label={`Min: ${minDurationMs}ms`}
              onClear={() => onMinDurationMsChange(null)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
        aria-label={`Clear ${label}`}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
