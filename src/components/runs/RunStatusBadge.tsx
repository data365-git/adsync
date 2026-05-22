import { cn, getStatusLabel } from "~/lib/utils";
import type { RunStatus } from "~/server/mocks/types";

interface RunStatusBadgeProps {
  status: RunStatus;
  timeLabel?: string;
  pulse?: boolean;
  className?: string;
}

const STATUS_STYLES = {
  queued: {
    pill: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-500",
    pulse: "bg-slate-400",
  },
  running: {
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    pulse: "bg-amber-400",
  },
  success: {
    pill: "border-green-200 bg-green-50 text-green-700",
    dot: "bg-green-500",
    pulse: "bg-green-400",
  },
  failed: {
    pill: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
    pulse: "bg-red-400",
  },
} satisfies Record<
  RunStatus,
  { pill: string; dot: string; pulse: string }
>;

export function RunStatusBadge({
  status,
  timeLabel,
  pulse = false,
  className,
}: RunStatusBadgeProps) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      {pulse && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-md opacity-0",
            "motion-safe:animate-ping motion-safe:opacity-60",
            statusStyle.pulse,
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
          statusStyle.pill,
        )}
        aria-label={
          timeLabel ? `${getStatusLabel(status)}, ${timeLabel}` : getStatusLabel(status)
        }
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", statusStyle.dot)}
        />
        {getStatusLabel(status)}
        {timeLabel ? (
          <>
            <span aria-hidden="true" className="text-slate-400">
              {"\u00b7"}
            </span>
            <span className="font-mono font-normal text-slate-500">
              {timeLabel}
            </span>
          </>
        ) : null}
      </span>
    </span>
  );
}
