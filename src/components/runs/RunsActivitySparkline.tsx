"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type ActivityBucket = {
  hour: string;
  success: number;
  failed: number;
  running: number;
};

const HEIGHT = 80;
const GAP = 2;
const COLORS = {
  success: "#22c55e",
  failed: "#ef4444",
  running: "#f59e0b",
};

function formatHour(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function RunsActivitySparkline({
  data,
  isLoading,
  isError,
}: {
  data: ActivityBucket[] | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-20 rounded-lg border border-slate-200 bg-slate-50" />
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex h-20 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-700"
      >
        Activity failed to load.
      </div>
    );
  }

  const buckets = data ?? [];
  if (buckets.length === 0) {
    return (
      <div className="flex h-20 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-500">
        No run activity in the selected window.
      </div>
    );
  }

  const maxTotal = Math.max(
    1,
    ...buckets.map((bucket) => bucket.success + bucket.failed + bucket.running),
  );
  const barWidth = 100 / buckets.length;

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <svg
          role="img"
          aria-label="Run activity for the last 24 hours"
          viewBox={`0 0 100 ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-20 w-full overflow-visible"
        >
          {buckets.map((bucket, index) => {
            const total = bucket.success + bucket.failed + bucket.running;
            const x = index * barWidth;
            const width = Math.max(0.5, barWidth - GAP);
            let y = HEIGHT;
            const segments = [
              { key: "success", count: bucket.success },
              { key: "failed", count: bucket.failed },
              { key: "running", count: bucket.running },
            ] as const;

            return (
              <Tooltip key={bucket.hour}>
                <TooltipTrigger render={<g tabIndex={0} className="focus:outline-none" />}>
                    <rect
                      x={x}
                      y={0}
                      width={width}
                      height={HEIGHT}
                      fill="transparent"
                    />
                    <rect
                      x={x}
                      y={0}
                      width={width}
                      height={HEIGHT}
                      rx={1}
                      fill="#f1f5f9"
                    />
                    {segments.map((segment) => {
                      const height = (segment.count / maxTotal) * HEIGHT;
                      y -= height;
                      return (
                        <rect
                          key={segment.key}
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={COLORS[segment.key]}
                        />
                      );
                    })}
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{formatHour(bucket.hour)}</p>
                    <p>{total} total</p>
                    <p>Success {bucket.success}</p>
                    <p>Failed {bucket.failed}</p>
                    <p>In progress {bucket.running}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>
      </div>
    </TooltipProvider>
  );
}
