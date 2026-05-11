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
      <div className="sticky top-0 z-30 border-b border-border bg-background/95">
        <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="size-7 rounded-md bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="h-7 w-16 rounded-lg bg-muted" />
            <div className="h-7 w-16 rounded-lg bg-muted" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-border px-4 py-2 animate-pulse">
        <div className="flex gap-3">
          <div className="h-5 w-16 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
      </div>

      {/* Step card skeletons */}
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="size-6 rounded-full bg-muted" />
              <div className="size-7 rounded-md bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-32 rounded bg-muted" />
                <div className="h-3 w-48 rounded bg-muted" />
              </div>
              <div className="size-6 rounded bg-muted" />
              <div className="size-6 rounded bg-muted" />
              <div className="size-6 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
