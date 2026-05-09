"use client";

import { ChevronDown, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { RunStatus } from "~/server/mocks/types";
import { MOCK_AD_ACCOUNTS } from "~/server/mocks/data";

const STATUS_OPTIONS: { value: RunStatus; label: string }[] = [
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

interface RunsFiltersProps {
  accountIds: string[];
  statuses: RunStatus[];
  onAccountIdsChange: (ids: string[]) => void;
  onStatusesChange: (statuses: RunStatus[]) => void;
  onClearAll: () => void;
}

export function RunsFilters({
  accountIds,
  statuses,
  onAccountIdsChange,
  onStatusesChange,
  onClearAll,
}: RunsFiltersProps) {
  const hasActiveFilters = accountIds.length > 0 || statuses.length > 0;

  function toggleAccount(id: string) {
    if (accountIds.includes(id)) {
      onAccountIdsChange(accountIds.filter((a) => a !== id));
    } else {
      onAccountIdsChange([...accountIds, id]);
    }
  }

  function toggleStatus(status: RunStatus) {
    if (statuses.includes(status)) {
      onStatusesChange(statuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...statuses, status]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Account multi-select */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label="Filter by account"
              className="gap-1.5"
            />
          }
        >
          Accounts
          {accountIds.length > 0 && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {accountIds.length}
            </span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-1"
          align="start"
          aria-label="Account filter options"
        >
          {MOCK_AD_ACCOUNTS.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No accounts</p>
          ) : (
            <ul role="list" className="flex flex-col gap-0.5">
              {MOCK_AD_ACCOUNTS.map((account) => (
                <li key={account.id}>
                  <label className="flex min-h-[2.25rem] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox
                      checked={accountIds.includes(account.id)}
                      onCheckedChange={() => toggleAccount(account.id)}
                      aria-label={account.label}
                    />
                    <span className="truncate">{account.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {/* Status multi-select */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label="Filter by status"
              className="gap-1.5"
            />
          }
        >
          Status
          {statuses.length > 0 && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {statuses.length}
            </span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          className="w-44 p-1"
          align="start"
          aria-label="Status filter options"
        >
          <ul role="list" className="flex flex-col gap-0.5">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <li key={value}>
                <label className="flex min-h-[2.25rem] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox
                    checked={statuses.includes(value)}
                    onCheckedChange={() => toggleStatus(value)}
                    aria-label={label}
                  />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          aria-label="Clear all filters"
          className="gap-1 text-muted-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  );
}
