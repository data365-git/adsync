import { Skeleton } from "~/components/ui/skeleton";

function ConnectionCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28 bg-slate-100" />
          <Skeleton className="h-3 w-40 bg-slate-100" />
        </div>
        <Skeleton className="h-5 w-20 rounded-md bg-slate-100" />
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Skeleton className="h-6 w-full bg-slate-100" />
        <Skeleton className="h-3 w-44 bg-slate-100" />
        <Skeleton className="h-1.5 w-full rounded-full bg-slate-100" />
        <Skeleton className="h-9 w-full bg-slate-100" />
      </div>

      <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
        <Skeleton className="h-9 flex-1 rounded-md bg-slate-100" />
        <Skeleton className="h-9 w-24 rounded-md bg-slate-100" />
        <Skeleton className="size-9 rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

export default function ConnectionsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-40 bg-slate-100" />
        <Skeleton className="mt-1 h-5 w-72 bg-slate-100" />
      </div>

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="Loading connections"
      >
        <ConnectionCardSkeleton />
        <ConnectionCardSkeleton />
        <ConnectionCardSkeleton />
      </div>
    </div>
  );
}
