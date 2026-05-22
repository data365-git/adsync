"use client";

import { cn } from "~/lib/utils";
import type { RunLog } from "~/server/mocks/types";

function formatTimestamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

const levelStyles: Record<
  RunLog["level"],
  { badge: string; border: string; text: string; weight: string }
> = {
  INFO: {
    badge: "bg-slate-100 text-slate-700",
    border: "border-l-border",
    text: "text-slate-700",
    weight: "font-normal",
  },
  WARN: {
    badge: "bg-amber-50 text-amber-700",
    border: "border-l-amber-400",
    text: "text-amber-700",
    weight: "font-normal",
  },
  ERROR: {
    badge: "bg-red-50 text-red-700",
    border: "border-l-red-500",
    text: "text-red-700",
    weight: "font-semibold",
  },
};

interface RunLogEntryProps {
  log: RunLog;
}

export function RunLogEntry({ log }: RunLogEntryProps) {
  const styles = levelStyles[log.level];
  const hasMeta = log.meta !== null && Object.keys(log.meta).length > 0;

  return (
    <li
      className={cn(
        "border-l-2 py-2 pl-3 pr-2",
        styles.border,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        {/* Timestamp */}
        <time
          dateTime={log.timestamp.toISOString()}
          className="shrink-0 font-mono text-xs text-slate-500"
        >
          {formatTimestamp(log.timestamp)}
        </time>

        {/* Level badge */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium",
            styles.badge,
          )}
          aria-label={`Log level: ${log.level}`}
        >
          {log.level}
        </span>

        {/* Message */}
        <span
          className={cn("min-w-0 break-words text-sm", styles.text, styles.weight)}
        >
          {log.message}
        </span>
      </div>

      {/* Collapsible meta block — collapsed by default, keyboard-accessible */}
      {hasMeta && (
        <details className="mt-1.5">
          <summary className="cursor-pointer rounded text-xs text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40">
            Show meta
          </summary>
          <pre className="mt-1.5 max-h-48 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-700">
            {JSON.stringify(log.meta, null, 2)}
          </pre>
        </details>
      )}
    </li>
  );
}
