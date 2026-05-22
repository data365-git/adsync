"use client";

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";

interface RunsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function RunsPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: RunsPaginationProps) {
  if (totalPages <= 1 && total === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 pt-4"
    >
      <p className="text-sm text-slate-500" aria-live="polite">
        {total === 0
          ? "No results"
          : `Page ${page} of ${totalPages}`}
      </p>

      <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="First page"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="size-8 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <ChevronFirst aria-hidden="true" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-8 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-8 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <ChevronRight aria-hidden="true" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Last page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="size-8 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <ChevronLast aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
