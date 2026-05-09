import { formatDuration } from "~/lib/utils";
import type { Run } from "~/server/mocks/types";

interface MetadataItemProps {
  label: string;
  value: React.ReactNode;
}

function MetadataItem({ label, value }: MetadataItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
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

export function RunMetadataGrid({ run }: RunMetadataGridProps) {
  return (
    <section aria-label="Run metadata">
      <dl
        className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/30 p-4
                   sm:grid-cols-2 md:grid-cols-4"
      >
        <MetadataItem
          label="Started"
          value={formatAbsoluteDate(run.startedAt)}
        />
        <MetadataItem
          label="Finished"
          value={formatAbsoluteDate(run.finishedAt)}
        />
        <MetadataItem
          label="Duration"
          value={formatDuration(run.durationMs)}
        />
        <MetadataItem label="Rows written" value={formatRowsWritten(run)} />
      </dl>
    </section>
  );
}
