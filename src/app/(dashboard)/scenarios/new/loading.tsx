export default function Loading() {
  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8 motion-safe:animate-pulse motion-reduce:opacity-70"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Header skeleton */}
      <div className="mb-6 space-y-2 text-center">
        <div className="bg-muted mx-auto h-6 w-36 rounded" />
        <div className="bg-muted mx-auto h-4 w-56 rounded" />
      </div>

      {/* Template card skeletons */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-border bg-card rounded-xl border px-4 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="bg-muted h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-muted h-4 w-40 rounded" />
                  <div className="bg-muted h-4 w-12 rounded-full" />
                </div>
                <div className="bg-muted h-3 w-full rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* From scratch link skeleton */}
      <div className="mt-6 flex justify-center">
        <div className="bg-muted h-4 w-36 rounded" />
      </div>
    </div>
  );
}
