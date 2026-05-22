"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api, type RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";

type LogEntry = RouterOutputs["runs"]["logs"][number];
type Severity = "INFO" | "WARN" | "ERROR";

const SEVERITIES: Severity[] = ["INFO", "WARN", "ERROR"];

function lineText(log: LogEntry): string {
  const meta = log.meta === null ? "" : ` ${JSON.stringify(log.meta)}`;
  return `${log.ts.toISOString()} [${log.level}] ${log.message}${meta}`;
}

type StreamLogEntry = Omit<LogEntry, "ts"> & { ts: string };

function normalizeStreamLog(log: StreamLogEntry): LogEntry {
  return {
    ...log,
    ts: new Date(log.ts),
  };
}

export function LogViewer({
  runId,
  runStatus,
}: {
  runId: string;
  runStatus: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
}) {
  const [severity, setSeverity] = useState<Severity | "ALL">("ALL");
  const [filter, setFilter] = useState("");
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logsQuery = api.runs.logs.useQuery({ runId });

  useEffect(() => {
    setLiveLogs(logsQuery.data ?? []);
  }, [logsQuery.data]);

  useEffect(() => {
    if (runStatus !== "RUNNING") return;

    const events = new EventSource(`/api/runs/${runId}/stream`);
    events.onmessage = (event) => {
      const rawData: unknown = event.data;
      if (typeof rawData !== "string") return;
      const parsed = JSON.parse(rawData) as StreamLogEntry;
      setLiveLogs((current) => {
        if (current.some((log) => log.id === parsed.id)) return current;
        return [...current, normalizeStreamLog(parsed)];
      });
    };

    return () => events.close();
  }, [runId, runStatus]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        event.target instanceof HTMLElement &&
        !["INPUT", "TEXTAREA"].includes(event.target.tagName)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const logs = liveLogs.filter((log) => {
    if (severity !== "ALL" && log.level !== severity) return false;
    if (!filter.trim()) return true;
    return lineText(log).toLowerCase().includes(filter.trim().toLowerCase());
  });

  async function copyLogs() {
    await navigator.clipboard.writeText(logs.map(lineText).join("\n"));
    toast.success("Logs copied");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Run logs</h2>
          <p className="text-sm text-slate-500">
            Line-numbered execution events for this run.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void copyLogs()}
          disabled={logs.length === 0}
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copy
        </Button>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter logs"
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", ...SEVERITIES] as const).map((level) => (
              <Button
                key={level}
                type="button"
                size="sm"
                variant={severity === level ? "default" : "outline"}
                onClick={() => setSeverity(level)}
                className="h-9"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {logsQuery.isLoading ? (
          <div className="rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-300">
            Loading logs...
          </div>
        ) : logsQuery.isError ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            Failed to load logs.
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No matching logs.
          </div>
        ) : (
          <ol className="max-h-96 overflow-auto rounded-md bg-slate-950 py-3 font-mono text-xs leading-6 text-slate-200">
            {logs.map((log, index) => (
              <li
                key={log.id}
                className="grid grid-cols-[3rem_1fr] px-3 hover:bg-white/5"
              >
                <span className="select-none text-right text-slate-500">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "min-w-0 pl-4 whitespace-pre-wrap",
                    log.level === "ERROR" && "text-red-300",
                    log.level === "WARN" && "text-amber-200",
                  )}
                >
                  {lineText(log)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
