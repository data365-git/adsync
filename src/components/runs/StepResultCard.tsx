"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { api, type RouterOutputs } from "~/trpc/react";
import { CsvExportButton } from "~/components/runs/CsvExportButton";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatDuration } from "~/lib/utils";

type RunDetailData = RouterOutputs["runs"]["getDetail"];
type Step = RunDetailData["scenario"]["steps"][number];
type RunLog = RunDetailData["run"]["logs"][number];
type StepStatus = "success" | "failed" | "running" | "skipped";

type StepResultCardProps = {
  runId: string;
  runStatus: RunDetailData["run"]["status"];
  scenarioId: string;
  step: Step;
  logs: RunLog[];
  status: StepStatus;
  errorMessage?: string;
};

function getMetaRecord(meta: unknown): Record<string, unknown> {
  return typeof meta === "object" && meta !== null
    ? (meta as Record<string, unknown>)
    : {};
}

function getCompletedLog(logs: RunLog[]): RunLog | undefined {
  return logs.find((log) => log.message.startsWith("Completed step"));
}

function getStartingLog(logs: RunLog[]): RunLog | undefined {
  return logs.find((log) => log.message.startsWith("Starting step"));
}

function getRowCount(meta: Record<string, unknown>): number | undefined {
  return typeof meta.rowCount === "number" ? meta.rowCount : undefined;
}

function getDurationMs(meta: Record<string, unknown>): number | undefined {
  return typeof meta.durationMs === "number" ? meta.durationMs : undefined;
}

function getSampleRows(meta: Record<string, unknown>): unknown[] {
  return Array.isArray(meta.sampleRows) ? meta.sampleRows : [];
}

function getOutputSchema(
  meta: Record<string, unknown>,
  sampleRows: Array<Record<string, unknown>>,
): string[] {
  const outputSchema = Array.isArray(meta.outputSchema)
    ? meta.outputSchema.filter(
        (column): column is string => typeof column === "string",
      )
    : [];

  return outputSchema.length > 0
    ? outputSchema
    : Object.keys(sampleRows[0] ?? {});
}

function getRecordRows(rows: unknown[]): Array<Record<string, unknown>> {
  return rows.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null && !Array.isArray(row),
  );
}

function getInputSampleRows(meta: Record<string, unknown>): unknown[] {
  return Array.isArray(meta.inputSampleRows) ? meta.inputSampleRows : [];
}

function getInputConfig(meta: Record<string, unknown>): Record<string, unknown> {
  return typeof meta.inputConfig === "object" && meta.inputConfig !== null
    ? (meta.inputConfig as Record<string, unknown>)
    : {};
}

type LinkOut = { label: string; href: string };

// Pull http(s) URL fields out of the first sample row so we can render them
// as one-click destinations (e.g. the Bitrix24 lead detail page).
function extractRowLinks(rows: unknown[]): LinkOut[] {
  const first = rows[0];
  if (!first || typeof first !== "object") return [];
  const out: LinkOut[] = [];
  for (const [key, value] of Object.entries(first as Record<string, unknown>)) {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      out.push({ label: key, href: value });
    }
  }
  return out;
}

function getStatusClass(status: StepStatus): string {
  switch (status) {
    case "success":
      return "border-green-200 bg-green-50 text-green-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    case "running":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "skipped":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getStatusDotClass(status: StepStatus): string {
  switch (status) {
    case "success":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
    case "running":
      return "bg-amber-500";
    case "skipped":
      return "bg-slate-500";
  }
}

function getStatusLabel(status: StepStatus): string {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "skipped":
      return "Skipped";
  }
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function OutputRowsTable({
  runId,
  position,
  sampleRows,
  outputSchema,
  rowCount,
}: {
  runId: string;
  position: number;
  sampleRows: Array<Record<string, unknown>>;
  outputSchema: string[];
  rowCount: number;
}) {
  const visibleRows = sampleRows.slice(0, 100);

  if (visibleRows.length === 0) return null;

  return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs font-medium text-slate-900">
          Output rows - showing {visibleRows.length} of {rowCount}
        </span>
        <CsvExportButton
          filename={`run-${runId}-step${position}.csv`}
          columns={outputSchema}
          rows={sampleRows}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {outputSchema.map((column) => (
                <th
                  key={column}
                  className="border-b border-slate-200 px-3 py-1.5 text-left font-medium text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100 last:border-0">
                {outputSchema.map((column) => (
                  <td key={column} className="px-3 py-1.5 align-top text-slate-700">
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StepResultCard({
  runId,
  scenarioId,
  step,
  logs,
  status,
  errorMessage,
}: StepResultCardProps) {
  const startingLog = getStartingLog(logs);
  const completedLog = getCompletedLog(logs);
  const startMeta = getMetaRecord(startingLog?.meta);
  const meta = getMetaRecord(completedLog?.meta);
  const rowCount = getRowCount(meta);
  const durationMs = getDurationMs(meta);
  const sampleRows = getRecordRows(getSampleRows(meta));
  const outputSchema = getOutputSchema(meta, sampleRows);
  const inputConfig = getInputConfig(startMeta);
  const inputSampleRows = getInputSampleRows(startMeta);
  const router = useRouter();
  const [isRerunOpen, setIsRerunOpen] = useState(false);
  const [overrideJson, setOverrideJson] = useState(() =>
    JSON.stringify(inputSampleRows, null, 2),
  );
  const rowLinks = extractRowLinks(sampleRows);
  const logLines = logs.map((log) => ({
    ts: log.ts,
    level: log.level,
    message: log.message,
    meta: log.meta,
  }));

  const copyError = async () => {
    if (!errorMessage) return;
    await navigator.clipboard.writeText(errorMessage);
    toast.success("Error copied");
  };

  const rerunMutation = api.runs.rerunFromStep.useMutation({
    onSuccess: ({ runId: newRunId }) => {
      toast.success("Re-run started");
      setIsRerunOpen(false);
      router.push(`/runs/${newRunId}`);
    },
    onError: (error) => {
      toast.error(`Re-run failed: ${error.message}`);
    },
  });

  const submitRerun = () => {
    let overridePayload: unknown;
    try {
      overridePayload = JSON.parse(overrideJson);
    } catch {
      toast.error("Override JSON is not valid.");
      return;
    }

    rerunMutation.mutate({
      runId,
      position: step.position,
      overridePayload,
    });
  };

  return (
    <Card
      tabIndex={0}
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none",
        status === "failed" && "border-l-4 border-l-red-500",
      )}
    >
      <CardHeader className="grid-cols-[1fr_auto] gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="break-words text-sm font-semibold text-slate-900">
            {step.position}. {step.moduleType}
          </CardTitle>
          <p className="text-xs text-slate-500">
            {durationMs === undefined ? "Duration unavailable" : formatDuration(durationMs)}
          </p>
        </div>
        <CardAction>
          <span
            className={cn(
              "inline-flex h-5 items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
              getStatusClass(status),
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", getStatusDotClass(status))}
            />
            {getStatusLabel(status)}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="space-y-3">
          {status === "failed" && errorMessage ? (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-red-700">
                {errorMessage}
              </p>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                aria-label="Copy error text"
                onClick={() => void copyError()}
                className="size-8 rounded-md bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/scenarios/${scenarioId}`} />}
              className="h-9 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
            >
              View step config
            </Button>
          </div>
          ) : null}
          <details open className="rounded-lg border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-900">
              Input
            </summary>
            <div className="space-y-3">
              <p className="px-3 text-xs text-slate-500">
                Module type: {step.moduleType} - Duration:{" "}
                {durationMs === undefined ? "unavailable" : formatDuration(durationMs)}
              </p>
              <div>
                <p className="px-3 pb-1 text-xs font-medium text-slate-500">JSON</p>
                <div className="px-3 pb-3">
                  <JsonBlock value={{ config: inputConfig, rows: inputSampleRows }} />
                </div>
              </div>
            </div>
          </details>
          <details
            open={status === "failed" || (rowCount ?? 0) > 0}
            className="rounded-lg border border-slate-200 bg-slate-50"
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-900">
              Output
            </summary>
            <div className="space-y-3">
              <p className="px-3 text-xs text-slate-500">
                Rows produced: {rowCount ?? 0}
              </p>
            {rowLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-3">
                {rowLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
                  >
                    {link.label}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
              <div>
                <p className="px-3 pb-1 text-xs font-medium text-slate-500">
                  Output JSON
                </p>
                <div className="px-3 pb-3">
                  <JsonBlock value={sampleRows} />
                  {sampleRows.length > 0 ? (
                    <OutputRowsTable
                      runId={runId}
                      position={step.position}
                      sampleRows={sampleRows}
                      outputSchema={outputSchema}
                      rowCount={rowCount ?? sampleRows.length}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </details>
          <details
            open={status === "failed"}
            className="rounded-lg border border-slate-200 bg-slate-50"
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-900">
              Log lines
            </summary>
            <div className="px-3 pb-3">
              <JsonBlock value={logLines} />
            </div>
          </details>
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-3 border-t border-slate-200 p-4">
        <p className="text-xs text-slate-500">
          Re-runs use up to 3 sample rows from each prior step.
        </p>
        <Dialog open={isRerunOpen} onOpenChange={setIsRerunOpen}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsRerunOpen(true)}
            className="h-9 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Re-run from this step
          </Button>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Re-run from step {step.position}</DialogTitle>
              <DialogDescription>
                Edit the upstream input rows for this step before starting the
                run.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={overrideJson}
              onChange={(event) => setOverrideJson(event.target.value)}
              className="min-h-72 font-mono text-xs leading-relaxed"
              spellCheck={false}
              aria-label={`Input JSON for step ${step.position}`}
            />
            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={rerunMutation.isPending}
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="button"
                size="sm"
                disabled={rerunMutation.isPending}
                onClick={submitRerun}
              >
                {rerunMutation.isPending ? "Starting..." : "Start re-run"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
