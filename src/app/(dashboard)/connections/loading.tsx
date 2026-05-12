import { Skeleton } from "~/components/ui/skeleton";

/**
 * Loading skeleton for the Connections page.
 * Card dimensions are hardcoded to match the real ConnectionCard layout exactly
 * (header ~72px, content ~80px, footer ~57px = ~225px total card height)
 * to prevent layout shift on hydration.
 */
function ConnectionCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="border-border bg-card flex flex-col overflow-hidden rounded-xl border"
    >
      {/* CardHeader — provider icon + title + status badge */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        {/* Status badge */}
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* CardContent — dates + expiry warning placeholder */}
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      {/* CardFooter — action buttons */}
      <div className="bg-muted/50 flex gap-2 border-t px-4 py-3">
        <Skeleton className="h-[2.75rem] flex-1 rounded-lg" />
        <Skeleton className="h-[2.75rem] w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default function ConnectionsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-1.5 h-4 w-72" />
      </div>

      <div
        className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2"
        aria-label="Loading connections"
      >
        <ConnectionCardSkeleton />
        <ConnectionCardSkeleton />
      </div>
    </div>
  );
}
