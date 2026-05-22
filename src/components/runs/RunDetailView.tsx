"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, GitCompareArrows, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { StepResultCard } from "~/components/runs/StepResultCard";
import { RunDiffView } from "~/components/runs/RunDiffView";
import { RunStatusBadge } from "~/components/runs/RunStatusBadge";
import { LogViewer } from "~/components/runs/LogViewer";
import { cn } from "~/lib/utils";
import type { RunStatus } from "~/server/mocks/types";

type RunDetailData = RouterOutputs["runs"]["getDetail"];
type RunLog = RunDetailData["run"]["logs"][number];
type Step = RunDetailData["scenario"]["steps"][number];
type StepStatus = "success" | "failed" | "running" | "skipped";

function getPosition(meta: unknown): number | undefined {
  if (typeof meta !== "object" || meta === null || !("position" in meta)) {
    return undefined;
  }
  const position = (meta as Record<string, unknown>).position;
  return typeof position === "number" ? position : undefined;
}

function getStepStatus(
  step: Step,
  logs: RunLog[],
  failedPosition: number | undefined,
): StepStatus {
  if (failedPosition === step.position) return "failed";
  if (logs.some((log) => log.message.startsWith("Completed step"))) {
    return "success";
  }
  if (logs.some((log) => log.message.startsWith("Starting step"))) {
    return "running";
  }
  return "skipped";
}

function findFailedPosition(data: RunDetailData): number | undefined {
  if (data.run.status !== "FAILED") return undefined;

  const startedPositions = data.run.logs
    .map((log) => getPosition(log.meta))
    .filter((position): position is number => position !== undefined);

  if (startedPositions.length === 0) return undefined;
  return Math.max(...startedPositions);
}

function normalizeStatus(status: RunDetailData["run"]["status"]): RunStatus {
  return status.toLowerCase() as RunStatus;
}

export function RunDetailView({ data }: { data: RunDetailData }) {
  const router = useRouter();
  const [showDiff, setShowDiff] = useState(false);
  const failedPosition = findFailedPosition(data);
  const errorMessage = data.run.errorMessage ?? undefined;
  const hasLoggedSteps = data.run.logs.length > 0;
  const retryMutation = api.runs.retry.useMutation({
    onSuccess: ({ runId }) => {
      toast.success("New run started", {
        action: { label: "View", onClick: () => router.push(`/runs/${runId}`) },
      });
      router.push(`/runs/${runId}`);
    },
    onError: (error) => {
      toast.error(`Retry failed: ${error.message}`);
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Breadcrumb">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/runs" />}
          className="h-9 gap-1.5 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to runs
        </Button>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              Run details
            </h1>
            <RunStatusBadge
              status={normalizeStatus(data.run.status)}
              pulse={data.run.status === "RUNNING"}
            />
          </div>
          <p className="text-sm text-slate-500">{data.scenario.name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {data.run.status === "FAILED" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDiff((current) => !current)}
              className="h-9 w-full rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 sm:w-auto"
            >
              <GitCompareArrows className="size-3.5" aria-hidden="true" />
              Compare to last success
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={retryMutation.isPending}
            onClick={() => retryMutation.mutate({ runId: data.run.id })}
            aria-label="Retry this run"
            className="h-9 w-full rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 sm:w-auto"
          >
            <RefreshCwIcon
              className={cn(
                "size-3.5",
                retryMutation.isPending && "animate-spin",
              )}
              aria-hidden="true"
            />
            <span>{retryMutation.isPending ? "Retrying..." : "Retry run"}</span>
          </Button>
        </div>
      </header>

      {showDiff ? (
        <RunDiffView runId={data.run.id} onClose={() => setShowDiff(false)} />
      ) : null}

      {!hasLoggedSteps ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Run has no logged steps yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {data.scenario.steps.map((step) => {
            const logs = data.logsByPosition[step.position] ?? [];
            const status = getStepStatus(step, logs, failedPosition);

            return (
              <StepResultCard
                key={step.id}
                runId={data.run.id}
                runStatus={data.run.status}
                scenarioId={data.scenario.id}
                step={step}
                logs={logs}
                status={status}
                errorMessage={status === "failed" ? errorMessage : undefined}
              />
            );
          })}
        </div>
      )}

      <LogViewer runId={data.run.id} runStatus={data.run.status} />
    </div>
  );
}
