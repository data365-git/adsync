import type { RunLog } from "~/server/mocks/types";
import { RunLogEntry } from "./RunLogEntry";

interface RunLogTimelineProps {
  logs: RunLog[];
}

export function RunLogTimeline({ logs }: RunLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <section aria-label="Run log">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Log timeline</h2>
        <p className="text-sm text-muted-foreground">No log entries for this run.</p>
      </section>
    );
  }

  return (
    <section aria-label="Run log">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Log timeline{" "}
        <span className="font-normal text-muted-foreground">
          ({logs.length} {logs.length === 1 ? "entry" : "entries"})
        </span>
      </h2>
      <ul
        aria-label="Run log"
        className="flex flex-col gap-0.5"
      >
        {logs.map((log) => (
          <RunLogEntry key={log.id} log={log} />
        ))}
      </ul>
    </section>
  );
}
