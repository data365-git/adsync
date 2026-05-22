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
import { AdAccountCard, type AdAccountCardAccount } from "./AdAccountCard";
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
        className="ml-1 inline size-3 text-slate-400"
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
        <TableRow key={i} className="h-[52px] border-b border-slate-100">
          <td className="py-3 pr-4 pl-5">
            <Skeleton className="h-4 w-36" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-40 font-mono" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-[18px] w-8 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-md" />
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
          className="flex h-[200px] flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-11 w-11 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-40" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <div className="flex items-center justify-between border-t pt-1">
            <Skeleton className="h-[18px] w-16 rounded-md" />
            <Skeleton className="h-11 w-24 rounded-md" />
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
  onEdit?: (account: AdAccountCardAccount) => void;
  onOpenDetails?: (account: AdAccountCardAccount) => void;
}

export function AdAccountsTable({
  onAddClick,
  onEdit,
  onOpenDetails,
}: AdAccountsTableProps = {}) {
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
        <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="h-10 border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="px-4 pl-5 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                  Name
                </TableHead>
                <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                  FB Account ID
                </TableHead>
                <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                  Enabled
                </TableHead>
                <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                  Schedule
                </TableHead>
                <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                  Last Run
                </TableHead>
                <TableHead className="w-10 px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase" />
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
  const openEdit = (account: AdAccountCardAccount) => {
    onEdit?.(account);
  };
  const openDetails = (account: AdAccountCardAccount) => {
    onOpenDetails?.(account);
  };

  // --- Empty state ---
  if (sorted.length === 0) {
    return <AdAccountEmptyState onAddClick={onAddClick} />;
  }

  // --- Success state ---
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="h-10 border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
              <TableHead className="px-4 pl-5 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase hover:text-slate-700 focus-visible:underline focus-visible:outline-none"
                  aria-label={`Sort by name${sort === "name" ? `, currently ${dir}` : ""}`}
                >
                  Name
                  <SortIcon column="name" sort={sort} dir={dir} />
                </button>
              </TableHead>
              <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                FB Account ID
              </TableHead>
              <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                Enabled
              </TableHead>
              <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                Schedule
              </TableHead>
              <TableHead className="px-4 text-left text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase">
                <button
                  type="button"
                  onClick={() => handleSort("lastRun")}
                  className="inline-flex items-center text-[12px] font-medium tracking-[0.04em] text-slate-500 uppercase hover:text-slate-700 focus-visible:underline focus-visible:outline-none"
                  aria-label={`Sort by last run${sort === "lastRun" ? `, currently ${dir}` : ""}`}
                >
                  Last Run
                  <SortIcon column="lastRun" sort={sort} dir={dir} />
                </button>
              </TableHead>
              <TableHead className="sr-only w-10 px-4">Actions</TableHead>
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
          <AdAccountCard
            key={account.id}
            account={account}
            onEdit={openEdit}
            onOpenDetails={openDetails}
          />
        ))}
      </div>
    </>
  );
}
