"use client";

import { use } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { RunDetailView } from "~/components/runs/RunDetailView";
import RunDetailLoading from "./loading";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = use(params);
  const detailQuery = api.runs.getDetail.useQuery({ id });

  if (detailQuery.isLoading) {
    return <RunDetailLoading />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
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
          className="flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
        >
          <AlertTriangle
            className="size-10 text-destructive"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              Failed to load run
            </p>
            <p className="text-sm text-muted-foreground">
              {detailQuery.error?.message ?? "Run not found."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void detailQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <RunDetailView data={detailQuery.data} />;
}
