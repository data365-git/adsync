import { cn, getStatusColor, getStatusLabel } from "~/lib/utils";
import type { RunStatus } from "~/server/mocks/types";

interface RunStatusBadgeProps {
  status: RunStatus;
  /**
   * When true, add a subtle pulse animation behind the badge to signal a live run.
   * The animation is gated on `prefers-reduced-motion: no-preference`.
   */
  pulse?: boolean;
  className?: string;
}

export function RunStatusBadge({
  status,
  pulse = false,
  className,
}: RunStatusBadgeProps) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      {pulse && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full opacity-0",
            "motion-safe:animate-ping motion-safe:opacity-60",
            status === "running" && "bg-status-running",
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          getStatusColor(status),
        )}
        aria-label={getStatusLabel(status)}
      >
        {/* Colour dot — non-textual reinforcement only */}
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            status === "queued" && "bg-status-queued",
            status === "running" && "bg-status-running",
            status === "success" && "bg-status-success",
            status === "failed" && "bg-status-failed",
          )}
        />
        {getStatusLabel(status)}
      </span>
    </span>
  );
}
