import type { AdAccount } from "~/server/mocks/types";
import { cn } from "~/lib/utils";

type LastRunStatus = AdAccount["lastRunStatus"];

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

type Props = {
  lastRunAt: Date | null;
  lastRunStatus: LastRunStatus;
  /** When a runNow is in-flight we overlay a "running" state */
  isRunning?: boolean;
};

export function LastRunBadge({ lastRunAt, lastRunStatus, isRunning }: Props) {
  const status = isRunning
    ? "running"
    : !lastRunAt || !lastRunStatus
      ? "never_run"
      : lastRunStatus === "success"
        ? "success"
        : "failed";

  const labelByStatus = {
    success: "Success",
    failed: "Failed",
    running: "Running",
    never_run: "Never run",
  } satisfies Record<typeof status, string>;

  const dotByStatus = {
    success: "bg-green-500",
    failed: "bg-red-500",
    running: "bg-amber-500",
    never_run: "bg-slate-400",
  } satisfies Record<typeof status, string>;

  const timeLabel =
    status === "running"
      ? "just now"
      : lastRunAt
        ? relativeTime(lastRunAt)
        : null;

  if (isRunning) {
    return (
      <InlineStatus
        dotClassName={dotByStatus.running}
        label={labelByStatus.running}
        timeLabel={timeLabel}
        ariaLabel="Status: Running"
      />
    );
  }

  if (!lastRunAt || !lastRunStatus) {
    return (
      <InlineStatus
        dotClassName={dotByStatus.never_run}
        label={labelByStatus.never_run}
        labelClassName="text-slate-500"
        ariaLabel="Status: Never run"
      />
    );
  }

  return (
    <InlineStatus
      dotClassName={dotByStatus[status]}
      label={labelByStatus[status]}
      timeLabel={timeLabel}
      ariaLabel={`Status: ${labelByStatus[status]}`}
    />
  );
}

function InlineStatus({
  dotClassName,
  label,
  labelClassName,
  timeLabel,
  ariaLabel,
}: {
  dotClassName: string;
  label: string;
  labelClassName?: string;
  timeLabel?: string | null;
  ariaLabel: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      role="status"
      aria-label={ariaLabel}
    >
      <span className={cn("size-1.5 rounded-full", dotClassName)} aria-hidden />
      <span className={cn("text-sm text-slate-700", labelClassName)}>
        {label}
      </span>
      {timeLabel ? (
        <>
          <span className="text-slate-400" aria-hidden>
            ·
          </span>
          <span className="font-mono text-xs text-slate-500">{timeLabel}</span>
        </>
      ) : null}
    </span>
  );
}
