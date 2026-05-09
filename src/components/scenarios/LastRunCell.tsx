import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Minus,
} from "lucide-react";
import { cn, getStatusColor, getStatusLabel } from "~/lib/utils";
import type { Scenario } from "~/server/mocks/types";

type Props = {
  lastRunAt: Scenario["lastRunAt"];
  lastRunStatus: Scenario["lastRunStatus"];
  isRunning?: boolean;
};

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

export function LastRunCell({ lastRunAt, lastRunStatus, isRunning }: Props) {
  if (isRunning) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">just now</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            getStatusColor("running"),
          )}
          role="status"
          aria-label="Status: Running"
        >
          <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden />
          Running
        </span>
      </div>
    );
  }

  if (!lastRunAt || !lastRunStatus) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        <span>Never run</span>
      </div>
    );
  }

  const runStatus = lastRunStatus === "success" ? "success" : "failed";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3 shrink-0" aria-hidden />
        {relativeTime(lastRunAt)}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          getStatusColor(runStatus),
        )}
        role="status"
        aria-label={`Status: ${getStatusLabel(runStatus)}`}
      >
        {runStatus === "success" ? (
          <CheckCircle2 className="size-3 shrink-0" aria-hidden />
        ) : (
          <XCircle className="size-3 shrink-0" aria-hidden />
        )}
        {getStatusLabel(runStatus)}
      </span>
    </div>
  );
}
