import { Skeleton } from "~/components/ui/skeleton";

function SkeletonTableRow() {
  return (
    <div className="flex h-[52px] items-center gap-4 border-b border-slate-100 px-4 pl-5 last:border-0">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-[18px] w-8 rounded-full" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="ml-auto h-8 w-8 rounded-md" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1 flex-1">
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
  );
}

export default function AdAccountsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <div className="flex h-10 items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 pl-5">
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

      <div className="flex flex-col gap-3 md:hidden">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
