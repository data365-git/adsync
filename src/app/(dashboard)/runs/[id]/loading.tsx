import { Skeleton } from "~/components/ui/skeleton";

export default function RunDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Title + badges */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Metadata grid — 4 cols desktop */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Sheets button placeholder area */}
      <Skeleton className="h-9 w-48 rounded-lg" />

      {/* Log timeline heading */}
      <Skeleton className="h-4 w-24" />

      {/* 5 log entry skeletons */}
      <ul aria-busy="true" aria-label="Loading log entries" className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="border-l-2 border-l-border py-2 pl-3">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-10 rounded" />
              <Skeleton className="h-4 w-64" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
