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
        <Skeleton className="h-3 w-44" />
      ) : identifier ? (
        <p className="text-muted-foreground truncate text-xs">{identifier}</p>
      ) : null}

      {/* Resource list panel */}
      <div className="border-border border-t pt-2">
        {isLoading && (
          <div className="space-y-1.5" aria-busy="true" aria-label="Loading resources">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex items-start gap-2">
            <AlertCircle
              className="text-destructive mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <p className="text-destructive flex-1 text-xs">Could not load resources.</p>
            <Button
              variant="link"
              size="sm"
              className="text-destructive h-auto p-0 text-xs underline"
              onClick={onRetry}
              aria-label="Retry loading resources"
            >
              Reconnect
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="text-muted-foreground text-xs">{emptyMessage}</p>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            <ul
              className="max-h-28 space-y-0.5 overflow-y-auto"
              aria-label="Available resources"
            >
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-1.5 py-0.5">
                  <span className="text-foreground min-w-0 flex-1 truncate text-xs">
                    {item.name}
                  </span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.name} in new tab`}
                      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {truncated && totalCount !== undefined && (
              <p className="text-muted-foreground mt-1 text-xs">
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
      className="text-muted-foreground size-3.5 animate-spin"
      aria-label="Loading"
    />
  );
}
