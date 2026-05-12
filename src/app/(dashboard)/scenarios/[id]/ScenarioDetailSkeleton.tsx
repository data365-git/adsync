/**
 * Scenario detail skeleton — shared between the route's `loading.tsx` boundary
 * and the in-component `isPending` guard inside `ScenarioDetailClient`. Two
 * sites use this so the user never sees a white flash between the route
 * transition and the first tRPC payload.
 */
export function ScenarioDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading scenario">
      {/* Header skeleton */}
      <div className="border-border bg-background/95 sticky top-0 z-30 border-b">
        <div className="flex items-center gap-3 px-4 py-3 motion-safe:animate-pulse motion-reduce:opacity-70">
          <div className="bg-muted size-7 rounded-md" />
          <div className="bg-muted h-4 w-48 rounded" />
          <div className="ml-auto flex items-center gap-2">
            <div className="bg-muted h-8 w-8 rounded-full" />
            <div className="bg-muted h-7 w-16 rounded-lg" />
            <div className="bg-muted h-7 w-16 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-border border-b px-4 py-2 motion-safe:animate-pulse motion-reduce:opacity-70">
        <div className="flex gap-3">
          <div className="bg-muted h-5 w-16 rounded" />
          <div className="bg-muted h-5 w-24 rounded" />
          <div className="bg-muted h-5 w-16 rounded" />
        </div>
      </div>

      {/* Step card skeletons */}
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 motion-safe:animate-pulse motion-reduce:opacity-70">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-border bg-card rounded-xl border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="bg-muted size-6 rounded-full" />
              <div className="bg-muted size-7 rounded-md" />
              <div className="flex-1 space-y-1">
                <div className="bg-muted h-3.5 w-32 rounded" />
                <div className="bg-muted h-3 w-48 rounded" />
              </div>
              <div className="bg-muted size-6 rounded" />
              <div className="bg-muted size-6 rounded" />
              <div className="bg-muted size-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
