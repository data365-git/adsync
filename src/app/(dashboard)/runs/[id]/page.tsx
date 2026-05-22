"use client";

import { use } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft, RefreshCw } from "lucide-react";

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
            className="h-9 gap-1.5 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Back to runs
          </Button>
        </nav>

        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-red-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-red-700">
              Failed to load run
            </p>
            <p className="text-sm text-red-700/90">
              {detailQuery.error?.message ?? "Run not found."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void detailQuery.refetch();
            }}
            className="h-9 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <RunDetailView data={detailQuery.data} />;
}
