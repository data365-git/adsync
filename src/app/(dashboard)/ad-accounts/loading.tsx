import { Skeleton } from "~/components/ui/skeleton";

function SkeletonTableRow() {
  return (
    <div className="flex h-14 items-center gap-4 border-b px-4 last:border-0">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-[18px] w-8 rounded-full" />
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3">
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
      <div className="flex items-center justify-between border-t pt-1">
        <Skeleton className="h-[18px] w-16 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default function AdAccountsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block rounded-xl border">
        {/* Header row */}
        <div className="flex h-10 items-center gap-4 border-b px-4">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <div className="ml-auto w-8" />
        </div>
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
      </div>

      {/* Mobile card skeleton */}
      <div className="md:hidden flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
