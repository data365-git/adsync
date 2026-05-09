import { Skeleton } from "~/components/ui/skeleton";

/** Shown by Next.js during streaming SSR or navigation. */
export default function RunsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Table skeleton — 8 rows, each matching the real row height (~40px) */}
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {/* Header */}
        <div className="flex items-center border-b bg-card px-2 py-2.5">
          {["w-24", "w-32", "w-20", "w-16", "hidden md:flex w-16", "hidden md:flex w-12", "w-5"].map(
            (cls, i) => (
              <div key={i} className={`mr-4 flex-shrink-0 ${cls}`}>
                <Skeleton className="h-4 w-full" />
              </div>
            ),
          )}
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center border-b px-2 py-3 last:border-0"
            aria-hidden="true"
          >
            <div className="mr-4 w-24 flex-shrink-0">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="mr-4 w-32 flex-shrink-0">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="mr-4 w-20 flex-shrink-0">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="mr-4 w-16 flex-shrink-0">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="mr-4 hidden w-16 flex-shrink-0 md:block">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="mr-4 hidden w-12 flex-shrink-0 md:block">
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="ml-auto w-5 flex-shrink-0">
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="size-7 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
