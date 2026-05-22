 "use client";

import { useEffect, useState } from "react";

import type { RunLog } from "~/server/mocks/types";
import { RunLogEntry } from "./RunLogEntry";

interface RunLogTimelineProps {
  logs: RunLog[];
  runId?: string;
  runStatus?: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
}

type StreamRunLog = Omit<RunLog, "timestamp"> & {
  ts?: string;
  timestamp?: string;
};

function normalizeStreamLog(log: StreamRunLog): RunLog {
  return {
    id: log.id,
    runId: log.runId,
    level: log.level,
    message: log.message,
    meta: log.meta,
    timestamp: new Date(log.timestamp ?? log.ts ?? Date.now()),
  };
}

export function RunLogTimeline({
  logs,
  runId,
  runStatus,
}: RunLogTimelineProps) {
  const [liveLogs, setLiveLogs] = useState(logs);

  useEffect(() => {
    setLiveLogs(logs);
  }, [logs]);

  useEffect(() => {
    if (!runId || runStatus !== "RUNNING") return;

    const events = new EventSource(`/api/runs/${runId}/stream`);
    events.onmessage = (event) => {
      const rawData: unknown = event.data;
      if (typeof rawData !== "string") return;
      const parsed = JSON.parse(rawData) as StreamRunLog;
      setLiveLogs((current) => {
        if (current.some((log) => log.id === parsed.id)) return current;
        return [...current, normalizeStreamLog(parsed)];
      });
    };

    return () => events.close();
  }, [runId, runStatus]);

  if (liveLogs.length === 0) {
    return (
      <section aria-label="Run log">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Log timeline</h2>
        <p className="text-sm text-slate-500">No log entries for this run.</p>
      </section>
    );
  }

  return (
    <section aria-label="Run log">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Log timeline{" "}
        <span className="font-normal text-slate-500">
          ({liveLogs.length} {liveLogs.length === 1 ? "entry" : "entries"})
        </span>
      </h2>
      <ul
        aria-label="Run log"
        className="flex flex-col gap-0.5"
      >
        {liveLogs.map((log) => (
          <RunLogEntry key={log.id} log={log} />
        ))}
      </ul>
    </section>
  );
}
