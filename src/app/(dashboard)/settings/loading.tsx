import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page heading skeleton */}
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-1.5 h-4 w-64" />
      </div>

      {/* Profile skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Timezone skeleton */}
      <SectionSkeleton />

      {/* Danger zone skeleton */}
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
