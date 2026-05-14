"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { StepResultCard } from "~/components/runs/StepResultCard";

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

export function RunDetailView({ data }: { data: RunDetailData }) {
  const failedPosition = findFailedPosition(data);
  const errorMessage = data.run.errorMessage ?? undefined;
  const hasLoggedSteps = data.run.logs.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Breadcrumb">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/runs" />}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to runs
        </Button>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Run details
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.scenario.name}
        </p>
      </header>

      {!hasLoggedSteps ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
