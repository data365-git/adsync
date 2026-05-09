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
  if (sort !== column) return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground" aria-hidden />;
  if (dir === "asc") return <ArrowUp className="ml-1 inline size-3" aria-hidden />;
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
        <TableRow key={i} className="h-14">
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
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-4 flex flex-col gap-3 h-[168px]">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
          </div>
          <Skeleton className="h-3.5 w-40" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-1 border-t">
            <Skeleton className="h-[18px] w-16 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdAccountsTable() {
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
        <div className="hidden md:block rounded-xl border">
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
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 py-16 text-center">
        <AlertCircle className="size-8 text-destructive" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Failed to load ad accounts</p>
          <p className="text-sm text-muted-foreground">
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
    return <AdAccountEmptyState />;
  }

  // --- Success state ---
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center font-medium text-foreground hover:text-foreground/80 focus-visible:outline-none focus-visible:underline"
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
                  className="inline-flex items-center font-medium text-foreground hover:text-foreground/80 focus-visible:outline-none focus-visible:underline"
                  aria-label={`Sort by last run${sort === "lastRun" ? `, currently ${dir}` : ""}`}
                >
                  Last Run
                  <SortIcon column="lastRun" sort={sort} dir={dir} />
                </button>
              </TableHead>
              <TableHead className="w-10 sr-only">Actions</TableHead>
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
      <div className="md:hidden flex flex-col gap-3">
        {sorted.map((account) => (
          <AdAccountCard key={account.id} account={account} />
        ))}
      </div>
    </>
  );
}
