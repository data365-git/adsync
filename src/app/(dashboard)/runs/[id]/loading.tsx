import { Skeleton } from "~/components/ui/skeleton";

export default function RunDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <ul aria-busy="true" aria-label="Loading run steps" className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
