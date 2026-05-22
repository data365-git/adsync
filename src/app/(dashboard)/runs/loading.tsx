import { Skeleton } from "~/components/ui/skeleton";

export default function RunsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex h-10 items-center border-b border-slate-200 bg-slate-50 px-4">
          {[
            "w-24",
            "w-32",
            "w-20",
            "w-16",
            "hidden md:flex w-16",
            "hidden md:flex w-12",
            "w-5",
          ].map((cls, i) => (
            <div key={i} className={`mr-4 flex-shrink-0 ${cls}`}>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>

        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[52px] items-center border-b border-slate-100 px-4 last:border-0"
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
