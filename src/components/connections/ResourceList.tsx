"use client";

import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export interface ResourceItem {
  id: string;
  name: string;
  url?: string | null;
}

export interface ResourceListProps {
  isLoading: boolean;
  isError: boolean;
  identifier: string | null;
  items: ResourceItem[];
  truncated: boolean;
  totalCount?: number;
  emptyMessage: string;
  onRetry: () => void;
}

export function ResourceList({
  isLoading,
  isError,
  identifier,
  items,
  truncated,
  totalCount,
  emptyMessage,
  onRetry,
}: ResourceListProps) {
  return (
    <div className="space-y-2">
      {/* Identifier line */}
      {isLoading ? (
        <Skeleton className="h-3 w-44 bg-slate-100" />
      ) : identifier ? (
        <p className="truncate text-xs text-slate-500">{identifier}</p>
      ) : null}

      {/* Resource list panel */}
      <div className="border-t border-slate-200 pt-2">
        {isLoading && (
          <div
            className="space-y-1.5"
            aria-busy="true"
            aria-label="Loading resources"
          >
            <Skeleton className="h-3 w-3/4 bg-slate-100" />
            <Skeleton className="h-3 w-1/2 bg-slate-100" />
            <Skeleton className="h-3 w-2/3 bg-slate-100" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">
            <AlertCircle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <p className="flex-1 text-xs">Could not load resources.</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto rounded-md p-0 text-xs text-red-700 underline focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
              onClick={onRetry}
              aria-label="Retry loading resources"
            >
              Reconnect
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="text-xs text-slate-500">{emptyMessage}</p>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            <ul
              className="max-h-28 space-y-0.5 overflow-y-auto"
              aria-label="Available resources"
            >
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-1.5 py-0.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-900">
                    {item.name}
                  </span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.name} in new tab`}
                      className="shrink-0 text-slate-500 transition-colors hover:text-slate-900 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {truncated && totalCount !== undefined && (
              <p className="mt-1 text-xs text-slate-500">
                and {totalCount - 25} more
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function InlineSpinner() {
  return (
    <Loader2
      className="size-3.5 animate-spin text-slate-500"
      aria-label="Loading"
    />
  );
}
