"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

function getRowCount(meta: Record<string, unknown>): number | undefined {
  return typeof meta.rowCount === "number" ? meta.rowCount : undefined;
}

function getDurationMs(meta: Record<string, unknown>): number | undefined {
  return typeof meta.durationMs === "number" ? meta.durationMs : undefined;
}

function getSampleRows(meta: Record<string, unknown>): unknown[] {
  return Array.isArray(meta.sampleRows) ? meta.sampleRows : [];
}

function getStatusClass(status: StepStatus): string {
  switch (status) {
    case "success":
      return "border-status-success/30 bg-status-success/10 text-green-700 dark:text-green-300";
    case "failed":
      return "border-status-failed/30 bg-status-failed/10 text-red-700 dark:text-red-300";
    case "running":
      return "border-status-running/30 bg-status-running/10 text-blue-700 dark:text-blue-300";
    case "skipped":
      return "border-status-queued/30 bg-status-queued/10 text-slate-700 dark:text-slate-300";
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

export function StepResultCard({
  runId,
  runStatus,
  scenarioId,
  step,
  logs,
  status,
  errorMessage,
}: StepResultCardProps) {
  const router = useRouter();
  const completedLog = getCompletedLog(logs);
  const meta = getMetaRecord(completedLog?.meta);
  const rowCount = getRowCount(meta);
  const durationMs = getDurationMs(meta);
  const sampleRows = getSampleRows(meta);

  const copyError = async () => {
    if (!errorMessage) return;
    await navigator.clipboard.writeText(errorMessage);
    toast.success("Error copied");
  };

  const rerun = api.runs.rerunFromStep.useMutation({
    onSuccess: ({ runId: nextRunId }) => {
      toast.success(`Re-running from step ${step.position}`);
      router.push(`/runs/${nextRunId}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const startRerun = () => {
    if (
      runStatus === "RUNNING" &&
      !window.confirm("This run is still running. Re-run from this step anyway?")
    ) {
      return;
    }
    rerun.mutate({ runId, position: step.position });
  };

  return (
    <Card
      tabIndex={0}
      className="rounded-lg border border-border shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="grid-cols-[1fr_auto] gap-3 border-b">
        <div className="min-w-0 space-y-1">
          <CardTitle className="break-words text-sm">
            {step.position}. {step.moduleType}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {durationMs === undefined ? "Duration unavailable" : formatDuration(durationMs)}
          </p>
        </div>
        <CardAction>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium",
              getStatusClass(status),
            )}
          >
            {getStatusLabel(status)}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === "failed" && errorMessage ? (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-destructive">
                {errorMessage}
              </p>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                aria-label="Copy error text"
                onClick={() => void copyError()}
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/scenarios/${scenarioId}`} />}
            >
              View step config
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Produced {rowCount ?? 0} rows
            </p>
            <details className="rounded-lg border border-border bg-muted/30">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                Sample rows
              </summary>
              <pre className="max-h-72 overflow-auto px-3 pb-3 text-xs leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(sampleRows, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Re-runs use up to 3 sample rows from each prior step.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={rerun.isPending}
          onClick={startRerun}
          title="Re-runs use up to 3 sample rows from each prior step."
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {rerun.isPending ? "Starting..." : "Re-run from this step"}
        </Button>
      </CardFooter>
    </Card>
  );
}
