import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

function SectionSkeleton() {
  return (
    <Card className="rounded-lg border border-slate-200 bg-white py-5 shadow-none ring-0">
      <CardHeader className="gap-1 px-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="px-5">
        <Skeleton className="h-16 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-busy="true" aria-label="Loading settings">
      {/* Page heading skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Profile skeleton */}
      <Card className="rounded-lg border border-slate-200 bg-white py-5 shadow-none ring-0">
        <CardHeader className="gap-1 px-5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="px-5">
          <div className="flex min-h-16 items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme skeleton */}
      <Card className="rounded-lg border border-slate-200 bg-white py-5 shadow-none ring-0">
        <CardHeader className="gap-1 px-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="px-5">
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Timezone skeleton */}
      <SectionSkeleton />

      {/* Danger zone skeleton */}
      <SectionSkeleton />
    </div>
  );
}
