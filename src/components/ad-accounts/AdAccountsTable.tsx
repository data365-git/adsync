"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import type { AdAccount } from "~/server/mocks/types";
import { AdAccountRow } from "./AdAccountRow";
import { AdAccountCard } from "./AdAccountCard";
import { AdAccountEmptyState } from "./AdAccountEmptyState";

type SortKey = "name" | "lastRun";
type SortDir = "asc" | "desc";

function SortIcon({
  column,
  sort,
  dir,
}: {
  column: SortKey;
  sort: SortKey | null;
  dir: SortDir | null;
}) {
  if (sort !== column)
    return (
      <ArrowUpDown
        className="text-muted-foreground ml-1 inline size-3"
        aria-hidden
      />
    );
  if (dir === "asc")
    return <ArrowUp className="ml-1 inline size-3" aria-hidden />;
  return <ArrowDown className="ml-1 inline size-3" aria-hidden />;
}

function sortAccounts(
  accounts: AdAccount[],
  sort: SortKey | null,
  dir: SortDir | null,
): AdAccount[] {
  if (!sort) return accounts;
  const sorted = [...accounts].sort((a, b) => {
    if (sort === "name") {
      return a.label.localeCompare(b.label);
    }
    if (sort === "lastRun") {
      const aTime = a.lastRunAt?.getTime() ?? 0;
      const bTime = b.lastRunAt?.getTime() ?? 0;
      return bTime - aTime; // default newest first
    }
    return 0;
  });
  if (dir === "asc" && sort === "lastRun") {
    return sorted.reverse();
  }
  if (dir === "desc" && sort === "name") {
    return sorted.reverse();
  }
  return sorted;
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i} className="h-18">
          <td className="p-2">
            <Skeleton className="h-4 w-36" />
          </td>
          <td className="p-2">
            <Skeleton className="h-4 w-40 font-mono" />
          </td>
          <td className="p-2">
            <Skeleton className="h-[18px] w-8 rounded-full" />
          </td>
          <td className="p-2">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="p-2">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </td>
          <td className="p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </td>
        </TableRow>
      ))}
    </>
  );
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex h-[200px] flex-col gap-4 rounded-xl border p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-40" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center justify-between border-t pt-1">
            <Skeleton className="h-[18px] w-16 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AdAccountsTableProps {
  /** When provided, the empty state's "Add your first ad account" CTA calls
   *  this instead of navigating to /ad-accounts/new — used by the page client
   *  to open the create modal in place. */
  onAddClick?: () => void;
}

export function AdAccountsTable({ onAddClick }: AdAccountsTableProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSort = searchParams.get("sort");
  const rawDir = searchParams.get("dir");
  const sort: SortKey | null =
    rawSort === "name" || rawSort === "lastRun" ? rawSort : null;
  const dir: SortDir | null =
    rawDir === "asc" || rawDir === "desc" ? rawDir : null;

  const { data, isLoading, isError, refetch, isFetching } =
    api.adAccounts.list.useQuery();

  const handleSort = useCallback(
    (col: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sort === col) {
        if (dir === "asc") {
          params.set("dir", "desc");
        } else if (dir === "desc") {
          params.delete("sort");
          params.delete("dir");
        } else {
          params.set("dir", "asc");
        }
      } else {
        params.set("sort", col);
        params.set("dir", "asc");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [sort, dir, searchParams, router, pathname],
  );

  // --- Loading state ---
  if (isLoading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="border-border hidden overflow-hidden rounded-xl border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>FB Account ID</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonRows />
            </TableBody>
          </Table>
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden">
          <SkeletonCards />
        </div>
      </>
    );
  }

  // --- Error state ---
  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-4 rounded-xl border py-16 text-center">
        <AlertCircle className="text-destructive size-8" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Failed to load ad accounts</p>
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
            className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden
          />
          Retry
        </Button>
      </div>
    );
  }

  const accounts = data ?? [];
  const sorted = sortAccounts(accounts, sort, dir);

  // --- Empty state ---
  if (sorted.length === 0) {
    return <AdAccountEmptyState onAddClick={onAddClick} />;
  }

  // --- Success state ---
  return (
    <>
      {/* Desktop table */}
      <div className="border-border hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="text-foreground hover:text-foreground/80 inline-flex items-center font-medium focus-visible:underline focus-visible:outline-none"
                  aria-label={`Sort by name${sort === "name" ? `, currently ${dir}` : ""}`}
                >
                  Name
                  <SortIcon column="name" sort={sort} dir={dir} />
                </button>
              </TableHead>
              <TableHead>FB Account ID</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("lastRun")}
                  className="text-foreground hover:text-foreground/80 inline-flex items-center font-medium focus-visible:underline focus-visible:outline-none"
                  aria-label={`Sort by last run${sort === "lastRun" ? `, currently ${dir}` : ""}`}
                >
                  Last Run
                  <SortIcon column="lastRun" sort={sort} dir={dir} />
                </button>
              </TableHead>
              <TableHead className="sr-only w-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((account) => (
              <AdAccountRow key={account.id} account={account} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout */}
      <div className="flex flex-col gap-4 md:hidden">
        {sorted.map((account) => (
          <AdAccountCard key={account.id} account={account} />
        ))}
      </div>
    </>
  );
}
