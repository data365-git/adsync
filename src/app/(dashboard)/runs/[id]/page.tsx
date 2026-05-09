"use client";

import { use } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { RunDetailHeader } from "~/components/runs/detail/RunDetailHeader";
import { RunMetadataGrid } from "~/components/runs/detail/RunMetadataGrid";
import { RunLogTimeline } from "~/components/runs/detail/RunLogTimeline";
import { RunErrorPanel } from "~/components/runs/detail/RunErrorPanel";
import { RunSheetsLink } from "~/components/runs/detail/RunSheetsLink";
import RunDetailLoading from "./loading";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = use(params);

  const runQuery = api.runs.getById.useQuery({ id });
  const logsQuery = api.runLogs.byRunId.useQuery({ runId: id });

  const isLoading = runQuery.isLoading || logsQuery.isLoading;
  const hasError = runQuery.isError || logsQuery.isError;
  const run = runQuery.data;
  const logs = logsQuery.data ?? [];

  if (isLoading) {
    return <RunDetailLoading />;
  }

  if (hasError || !run) {
    const errorMessage =
      runQuery.error?.message ??
      logsQuery.error?.message ??
      "Run not found.";

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb preserved even in error state */}
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

        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
        >
          <AlertTriangle
            className="size-10 text-destructive"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              Failed to load run
            </p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void runQuery.refetch();
              void logsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isFailed = run.status === "failed";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header: breadcrumb + title + badges */}
      <RunDetailHeader run={run} />

      {/* Metadata grid: started / finished / duration / rows written */}
      <RunMetadataGrid run={run} />

      {/* "View in Google Sheets" — reward for a successful run */}
      {run.sheetsUrl !== null && <RunSheetsLink sheetsUrl={run.sheetsUrl} />}

      {/* Error panel — shown only for failed runs, above the log timeline */}
      {isFailed && run.errorMessage !== null && (
        <RunErrorPanel errorMessage={run.errorMessage} />
      )}

      {/* Log timeline */}
      <RunLogTimeline logs={logs} />
    </div>
  );
}
