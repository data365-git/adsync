"use client";

import { AlertCircle, Plug } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ConnectionCard } from "~/components/connections/ConnectionCard";
import { Skeleton } from "~/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex min-h-[5rem] flex-col gap-3 px-4 pt-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex gap-2 border-t bg-muted/50 px-4 py-3">
        <Skeleton className="h-[2.75rem] flex-1 rounded-lg" />
        <Skeleton className="h-[2.75rem] w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function ConnectionsClient() {
  const {
    data: connections,
    isLoading,
    isError,
    refetch,
  } = api.connections.list.useQuery();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your Google Sheets and Facebook Ads integrations.
        </p>
      </div>

      {/* Error state — inline, not full-page, keeps chrome visible */}
      {isError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="font-medium text-destructive">
              Could not load connections.
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Check your network and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            aria-label="Retry loading connections"
            className="shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          aria-label="Loading connections"
          aria-busy="true"
        >
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && connections?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Plug className="size-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">
            No connections yet
          </h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Connect Google Sheets or Facebook to get started. Your syncs need
            both.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              size="sm"
              aria-label="Connect Google Sheets"
              className="min-h-[2.75rem]"
            >
              Connect Google Sheets
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Connect Facebook Ads"
              className="min-h-[2.75rem]"
            >
              Connect Facebook Ads
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {!isLoading && !isError && connections && connections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {connections.map((connection) => (
            <ConnectionCard key={connection.id} connection={connection} />
          ))}
        </div>
      )}
    </div>
  );
}
