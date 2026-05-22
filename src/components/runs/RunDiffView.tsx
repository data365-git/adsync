"use client";

import { AlertTriangle, GitCompareArrows } from "lucide-react";

import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { formatDuration } from "~/lib/utils";

type DiffData = RouterOutputs["runs"]["compareWithLastSuccess"];
type DiffStep = DiffData["current"]["steps"][number];

function stringifyRows(rows: DiffStep["sampleRows"]): string[] {
  return JSON.stringify(rows, null, 2).split("\n");
}

function buildJsonDiff(
  baselineRows: DiffStep["sampleRows"],
  currentRows: DiffStep["sampleRows"],
) {
  const baselineLines = stringifyRows(baselineRows);
  const currentLines = stringifyRows(currentRows);
  const lineCount = Math.max(baselineLines.length, currentLines.length);
  const baseline: Array<{ value: string; changed: boolean }> = [];
  const current: Array<{ value: string; changed: boolean }> = [];

  for (let index = 0; index < lineCount; index += 1) {
    const baselineLine = baselineLines[index] ?? "";
    const currentLine = currentLines[index] ?? "";
    const changed = baselineLine !== currentLine;
    baseline.push({ value: baselineLine, changed });
    current.push({ value: currentLine, changed });
  }

  return { baseline, current };
}

function formatDelta(current: number | null, baseline: number | null): string {
  if (current === null || baseline === null) return "Duration delta unavailable";
  const delta = current - baseline;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatDuration(delta)} vs baseline`;
}

function StepDiff({
  current,
  baseline,
}: {
  current: DiffStep;
  baseline: DiffStep | undefined;
}) {
  const diff = buildJsonDiff(baseline?.sampleRows ?? [], current.sampleRows);

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {current.position}. {current.moduleType}
          </h3>
          <p className="text-xs text-slate-500">
            {formatDelta(current.durationMs, baseline?.durationMs ?? null)}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
          Baseline {baseline?.durationMs === null || baseline === undefined
            ? "unknown"
            : formatDuration(baseline.durationMs)}
          {" / "}Current {current.durationMs === null
            ? "unknown"
            : formatDuration(current.durationMs)}
        </span>
      </header>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Last success</p>
          <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-200">
            {diff.baseline.map((line, index) => (
              <span
                key={index}
                className={line.changed ? "block text-red-300" : "block"}
              >
                {line.changed ? "- " : "  "}
                {line.value}
              </span>
            ))}
          </pre>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Current run</p>
          <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-200">
            {diff.current.map((line, index) => (
              <span
                key={index}
                className={line.changed ? "block text-green-300" : "block"}
              >
                {line.changed ? "+ " : "  "}
                {line.value}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </article>
  );
}

export function RunDiffView({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const diffQuery = api.runs.compareWithLastSuccess.useQuery({ runId });

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <GitCompareArrows className="size-4" aria-hidden="true" />
            Compare to last success
          </h2>
          <p className="text-sm text-slate-500">
            Baseline run {diffQuery.data?.baseline.runId ?? "loading..."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {diffQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Loading comparison...
        </div>
      ) : diffQuery.isError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertTriangle className="mt-0.5 size-4" aria-hidden="true" />
          {diffQuery.error.message}
        </div>
      ) : diffQuery.data ? (
        <div className="space-y-3">
          {diffQuery.data.current.steps.map((current) => (
            <StepDiff
              key={`${current.position}:${current.moduleType}`}
              current={current}
              baseline={diffQuery.data.baseline.steps.find(
                (step) => step.position === current.position,
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
