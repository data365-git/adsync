"use client";

import { Activity, AlertCircle } from "lucide-react";
import { formatDuration } from "~/lib/utils";

type PerformanceSummary = {
  slowestStep: { position: number; moduleType: string; p95Ms: number };
  avgPerDay: Array<{ day: string; ms: number }>;
};

function buildPath(points: Array<{ day: string; ms: number }>): string {
  if (points.length === 0) return "";
  const max = Math.max(1, ...points.map((point) => point.ms));
  return points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 32 - (point.ms / max) * 28;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function PerformanceCard({
  data,
  isLoading,
  isError,
}: {
  data: PerformanceSummary | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-28 rounded-lg border border-slate-200 bg-slate-50" />
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex min-h-24 items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Performance summary failed to load.
      </div>
    );
  }

  const slowest = data?.slowestStep;
  const path = buildPath(data?.avgPerDay ?? []);

  return (
    <section
      aria-label="Runs performance summary"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1.4fr]"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Activity className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.04em] text-slate-500 uppercase">
            Slowest step p95
          </p>
          {slowest && slowest.position > 0 ? (
            <div className="mt-1 space-y-1">
              <p className="truncate text-sm font-medium text-slate-900">
                Step {slowest.position}: {slowest.moduleType}
              </p>
              <p className="text-sm tabular-nums text-slate-600">
                {formatDuration(slowest.p95Ms)}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No completed steps yet.</p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-[0.04em] text-slate-500 uppercase">
            7-day average duration
          </p>
          <p className="text-xs text-slate-500">ms per run</p>
        </div>
        {path ? (
          <svg
            role="img"
            aria-label="Seven day average run duration"
            viewBox="0 0 100 36"
            preserveAspectRatio="none"
            className="h-12 w-full"
          >
            <path d={path} fill="none" stroke="#0ea5e9" strokeWidth="2" />
            <line x1="0" y1="34" x2="100" y2="34" stroke="#e2e8f0" />
          </svg>
        ) : (
          <div className="flex h-12 items-center text-sm text-slate-500">
            No duration trend yet.
          </div>
        )}
      </div>
    </section>
  );
}
