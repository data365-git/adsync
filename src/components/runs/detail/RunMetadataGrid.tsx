import Link from "next/link";

import { cn, formatDuration } from "~/lib/utils";
import type { Run } from "~/server/mocks/types";

interface MetadataItemProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

function MetadataItem({ label, value, valueClassName }: MetadataItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
        {label}
      </dt>
      <dd className={cn("text-sm font-medium text-slate-900", valueClassName)}>
        {value}
      </dd>
    </div>
  );
}

function formatAbsoluteDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatRowsWritten(run: Run): string {
  const hasC = run.campaignRowsWritten !== null;
  const hasA = run.adRowsWritten !== null;
  if (!hasC && !hasA) return "—";
  if (hasC && hasA) {
    return `${run.campaignRowsWritten}C / ${run.adRowsWritten}A`;
  }
  if (hasC) return `${run.campaignRowsWritten}C`;
  return `${run.adRowsWritten}A`;
}

interface RunMetadataGridProps {
  run: Run;
}

function ScenarioCellValue({ run }: { run: Run }) {
  const name = run.scenarioName ?? run.scenarioId;
  const isQuickSetup = run.scenarioKind === "QUICK_SETUP";
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/scenarios/${run.scenarioId}`}
        className="truncate rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        title={name}
      >
        {name}
      </Link>
      {isQuickSetup ? (
        <span className="inline-flex shrink-0 items-center rounded-sm bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-sky-700">
          Quick
        </span>
      ) : null}
    </div>
  );
}

export function RunMetadataGrid({ run }: RunMetadataGridProps) {
  return (
    <section aria-label="Run metadata">
      <dl
        className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm
                   sm:grid-cols-2 md:grid-cols-4"
      >
        <MetadataItem label="Scenario" value={<ScenarioCellValue run={run} />} />
        <MetadataItem
          label="Started"
          value={formatAbsoluteDate(run.startedAt)}
          valueClassName="tabular-nums"
        />
        <MetadataItem
          label="Finished"
          value={formatAbsoluteDate(run.finishedAt)}
          valueClassName="tabular-nums"
        />
        <MetadataItem
          label="Duration"
          value={formatDuration(run.durationMs)}
          valueClassName="tabular-nums"
        />
        <MetadataItem
          label="Rows written"
          value={formatRowsWritten(run)}
          valueClassName="tabular-nums"
        />
      </dl>
    </section>
  );
}
