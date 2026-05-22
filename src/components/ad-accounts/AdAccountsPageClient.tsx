"use client";

import * as React from "react";
import { AlertCircle, LayoutGrid, List, Plus, RefreshCw, Search } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { AdAccountsTable } from "./AdAccountsTable";
import { AdAccountModal } from "./AdAccountModal";
import { AdAccountCard, type AdAccountCardAccount } from "./AdAccountCard";
import { AdAccountDetailDrawer } from "./AdAccountDetailDrawer";
import { AdAccountEmptyState } from "./AdAccountEmptyState";
import { healthDot } from "./health";

type SortKey = "lastSync" | "name" | "currency" | "pinned";
type StatusFilter = "all" | "green" | "amber" | "red";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="min-h-[260px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="mt-5 border-t border-slate-100 pt-3">
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function sortAccounts(accounts: AdAccountCardAccount[], sort: SortKey) {
  return [...accounts].sort((a, b) => {
    const pinnedDelta = Number(b.isPinned ?? false) - Number(a.isPinned ?? false);
    if (pinnedDelta !== 0) return pinnedDelta;
    if (sort === "name") return a.label.localeCompare(b.label);
    if (sort === "currency") {
      return (a.currency ?? "USD").localeCompare(b.currency ?? "USD");
    }
    if (sort === "pinned") return pinnedDelta;
    return (
      (b.lastSyncedAt?.getTime() ?? 0) - (a.lastSyncedAt?.getTime() ?? 0)
    );
  });
}

export function AdAccountsPageClient() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] =
    React.useState<AdAccountCardAccount | null>(null);
  const [detailAccount, setDetailAccount] =
    React.useState<AdAccountCardAccount | null>(null);
  const [search, setSearch] = React.useState("");
  const [currencyFilter, setCurrencyFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [hasScenariosOnly, setHasScenariosOnly] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("lastSync");
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(["grid", "table"]).withDefault("grid"),
  );
  const utils = api.useUtils();

  const { data, isLoading, isError, refetch, isFetching } =
    api.adAccounts.list.useQuery();
  const accounts = (data ?? []) as AdAccountCardAccount[];
  const showHeaderAddButton = !isLoading && accounts.length > 0;
  const currencies = Array.from(
    new Set(accounts.map((account) => account.currency ?? "USD")),
  ).sort();

  const filtered = sortAccounts(
    accounts.filter((account) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        account.label.toLowerCase().includes(q) ||
        account.fbAccountId.toLowerCase().includes(q);
      const matchesCurrency =
        currencyFilter === "all" ||
        (account.currency ?? "USD") === currencyFilter;
      const matchesStatus =
        statusFilter === "all" || healthDot(account.lastSyncedAt) === statusFilter;
      const matchesScenarios =
        !hasScenariosOnly || (account.scenarioCount ?? 0) > 0;
      return (
        matchesSearch &&
        matchesCurrency &&
        matchesStatus &&
        matchesScenarios
      );
    }),
    sort,
  );

  const openCreate = React.useCallback(() => setCreateOpen(true), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Ad Accounts
          </h1>
          <p className="text-sm text-slate-500">
            Configure Facebook ad accounts and their sync schedules.
          </p>
        </div>
        {showHeaderAddButton && (
          <Button
            type="button"
            onClick={openCreate}
            className="h-9 shrink-0 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            <Plus className="size-4" aria-hidden />
            Add ad account
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search ad accounts</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search accounts"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currencyFilter}
              onChange={(event) => setCurrencyFilter(event.target.value)}
              aria-label="Filter by currency"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            >
              <option value="all">Currency</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter by sync status"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            >
              <option value="all">Status</option>
              <option value="green">Fresh</option>
              <option value="amber">Stale</option>
              <option value="red">Needs sync</option>
            </select>
            <Button
              type="button"
              variant={hasScenariosOnly ? "default" : "outline"}
              onClick={() => setHasScenariosOnly((value) => !value)}
              className={cn(
                "h-10 rounded-md px-3 text-sm font-medium focus-visible:ring-sky-500/40",
                !hasScenariosOnly &&
                  "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              Has scenarios
            </Button>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort ad accounts"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            >
              <option value="lastSync">Last sync</option>
              <option value="name">Name</option>
              <option value="currency">Currency</option>
              <option value="pinned">Pinned-first</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => void setView("grid")}
            aria-label="Grid view"
            className="rounded-md focus-visible:ring-sky-500/40"
          >
            <LayoutGrid className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => void setView("table")}
            aria-label="Table view"
            className="rounded-md focus-visible:ring-sky-500/40"
          >
            <List className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <AdAccountsTable
          onAddClick={openCreate}
          onEdit={setEditingAccount}
          onOpenDetails={setDetailAccount}
        />
      ) : isLoading ? (
        <GridSkeleton />
      ) : isError ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-red-900">
              Failed to load ad accounts
            </p>
            <p className="text-sm text-red-700">
              Check your connection and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="ml-auto h-8 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            <RefreshCw
              className={cn("size-3.5", isFetching && "animate-spin")}
              aria-hidden
            />
            Retry
          </Button>
        </div>
      ) : accounts.length === 0 ? (
        <AdAccountEmptyState onAddClick={openCreate} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No ad accounts match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((account) => (
            <AdAccountCard
              key={account.id}
              account={account}
              onEdit={setEditingAccount}
              onOpenDetails={setDetailAccount}
            />
          ))}
        </div>
      )}

      <AdAccountDetailDrawer
        account={detailAccount}
        onClose={() => setDetailAccount(null)}
      />

      <AdAccountModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="new"
        onSaved={() => {
          void utils.adAccounts.list.invalidate();
        }}
      />

      <AdAccountModal
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!open) setEditingAccount(null);
        }}
        mode="edit"
        initialData={editingAccount ?? undefined}
        onSaved={() => {
          setEditingAccount(null);
          void utils.adAccounts.list.invalidate();
        }}
      />
    </div>
  );
}
