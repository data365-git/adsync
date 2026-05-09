export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Header skeleton */}
      <div className="mb-6 text-center space-y-2">
        <div className="mx-auto h-6 w-36 rounded bg-muted" />
        <div className="mx-auto h-4 w-56 rounded bg-muted" />
      </div>

      {/* Template card skeletons */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card px-4 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-4 w-12 rounded-full bg-muted" />
                </div>
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* From scratch link skeleton */}
      <div className="mt-6 flex justify-center">
        <div className="h-4 w-36 rounded bg-muted" />
      </div>
    </div>
  );
}
