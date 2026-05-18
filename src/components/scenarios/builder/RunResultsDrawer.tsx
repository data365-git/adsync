"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { StepResultCard } from "~/components/runs/StepResultCard";
import { api, type RouterOutputs } from "~/trpc/react";

type RunDetailData = RouterOutputs["runs"]["getDetail"];
type Step = RunDetailData["scenario"]["steps"][number];
type RunLog = RunDetailData["run"]["logs"][number];
type StepStatus = "success" | "failed" | "running" | "skipped";

type RunResultsDrawerProps = {
  runId: string | null;
  onClose: () => void;
};

function getPosition(meta: unknown): number | undefined {
  if (typeof meta !== "object" || meta === null || !("position" in meta)) return undefined;
  const position = (meta as Record<string, unknown>).position;
  return typeof position === "number" ? position : undefined;
}

function failedPosition(data: RunDetailData): number | undefined {
  if (data.run.status !== "FAILED") return undefined;
  const positions = data.run.logs
    .map((log) => getPosition(log.meta))
    .filter((position): position is number => position !== undefined);
  return positions.length > 0 ? Math.max(...positions) : undefined;
}

function stepStatus(step: Step, logs: RunLog[], failed: number | undefined): StepStatus {
  if (failed === step.position) return "failed";
  if (logs.some((log) => log.message.startsWith("Completed step"))) return "success";
  if (logs.some((log) => log.message.startsWith("Starting step"))) return "running";
  return "skipped";
}

export function RunResultsDrawer({ runId, onClose }: RunResultsDrawerProps) {
  const [expanded, setExpanded] = React.useState(true);
  const query = api.runs.getDetail.useQuery(
    { id: runId ?? "" },
    { enabled: Boolean(runId), refetchInterval: 2_000 },
  );

  if (!runId) return null;

  const data = query.data;
  const failed = data ? failedPosition(data) : undefined;

  return (
    <section
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background shadow-2xl md:left-60"
      style={{ height: expanded ? "50vh" : 160 }}
      aria-label="Run results"
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Run results</p>
          <p className="truncate text-xs text-muted-foreground">
            {data ? data.scenario.name : "Loading run..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/runs/${runId}`} />}>
            Open full run
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Collapse run results" : "Expand run results"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close run results">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="h-[calc(100%-3rem)] overflow-y-auto p-4">
        {query.isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading run output...
          </div>
        ) : query.isError || !data ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Could not load this run.
          </div>
        ) : (
          <div className="grid gap-4">
            {data.scenario.steps.map((step) => {
              const logs = data.logsByPosition[step.position] ?? [];
              const status = stepStatus(step, logs, failed);
              return (
                <StepResultCard
                  key={step.id}
                  runId={data.run.id}
                  runStatus={data.run.status}
                  scenarioId={data.scenario.id}
                  step={step}
                  logs={logs}
                  status={status}
                  errorMessage={status === "failed" ? data.run.errorMessage ?? undefined : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
