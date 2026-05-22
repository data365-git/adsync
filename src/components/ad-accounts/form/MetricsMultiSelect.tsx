"use client";

import * as React from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { FB_METRICS } from "~/lib/constants";
import { cn } from "~/lib/utils";

type MetricGroup = keyof typeof FB_METRICS;
type Metric = (typeof FB_METRICS)[MetricGroup][number];

interface MetricsMultiSelectProps {
  value: string[];
  onChange: (metrics: string[]) => void;
  onBlur?: () => void;
  error?: string;
}

const ALL_GROUPS = Object.keys(FB_METRICS) as MetricGroup[];

function formatMetricLabel(metric: string): string {
  return metric
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function MetricsMultiSelect({
  value,
  onChange,
  onBlur,
  error,
}: MetricsMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onBlur]);

  function toggleMetric(metric: string) {
    if (value.includes(metric)) {
      onChange(value.filter((m) => m !== metric));
    } else {
      onChange([...value, metric]);
    }
  }

  function toggleGroup(group: MetricGroup) {
    const groupMetrics = FB_METRICS[group] as readonly string[];
    const allSelected = groupMetrics.every((m) => value.includes(m));
    if (allSelected) {
      onChange(value.filter((m) => !groupMetrics.includes(m)));
    } else {
      const toAdd = groupMetrics.filter((m) => !value.includes(m));
      onChange([...value, ...toAdd]);
    }
  }

  function clearAll() {
    onChange([]);
  }

  const selectedCount = value.length;

  const filtered = ALL_GROUPS.map((group) => {
    const metrics = (FB_METRICS[group] as readonly string[]).filter((m) =>
      search
        ? m.toLowerCase().includes(search.toLowerCase()) ||
          formatMetricLabel(m).toLowerCase().includes(search.toLowerCase())
        : true,
    );
    return { group, metrics };
  }).filter((g) => g.metrics.length > 0);

  return (
    <div className="space-y-1" ref={containerRef}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${selectedCount} metrics selected`}
          data-invalid={error ? "true" : undefined}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 py-1 text-sm text-slate-900 transition-colors outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20",
            error
              ? "border-destructive ring-destructive/20 ring-3"
              : "border-slate-300 hover:bg-slate-50",
            open ? "border-sky-500 ring-2 ring-sky-500/20" : "",
          )}
        >
          <span className="flex items-center gap-2">
            {selectedCount > 0 ? (
              <>
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {selectedCount}
                </span>
                <span className="text-sm">
                  {selectedCount === 1 ? "metric" : "metrics"} selected
                </span>
              </>
            ) : (
              <span className="text-slate-500">Select metrics…</span>
            )}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {selectedCount > 0 && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear all metrics"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    clearAll();
                  }
                }}
                className="rounded p-0.5 hover:bg-slate-100"
              >
                <XIcon className="size-3.5 text-slate-500" />
              </span>
            )}
            <ChevronDownIcon
              className={cn(
                "size-4 text-slate-500 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
            {/* Search input */}
            <div className="border-b border-slate-200 px-2 py-1.5">
              <input
                type="text"
                placeholder="Search metrics…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                    triggerRef.current?.focus();
                  }
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No metrics found.
                </p>
              ) : (
                filtered.map(({ group, metrics }) => {
                  const groupMetrics = metrics as Metric[];
                  const allSelected = groupMetrics.every((m) =>
                    value.includes(m),
                  );
                  const someSelected = groupMetrics.some((m) =>
                    value.includes(m),
                  );
                  return (
                    <div key={group} className="mb-1">
                      {/* Group header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-slate-100"
                      >
                        <div
                          className={cn(
                            "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                            allSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : someSelected
                                ? "border-slate-900 bg-slate-200"
                                : "border-slate-300",
                          )}
                        >
                          {allSelected && (
                            <svg
                              viewBox="0 0 8 8"
                              className="size-2.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path d="M1 4l2 2 4-4" />
                            </svg>
                          )}
                          {!allSelected && someSelected && (
                            <span className="block h-px w-2 bg-slate-900" />
                          )}
                        </div>
                        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          {group}
                        </span>
                        <span className="ml-auto text-xs text-slate-500">
                          {groupMetrics.filter((m) => value.includes(m)).length}
                          /{groupMetrics.length}
                        </span>
                      </button>

                      {/* Group items */}
                      <div className="pl-2">
                        {metrics.map((metric) => {
                          const checked = value.includes(metric);
                          return (
                            <button
                              key={metric}
                              type="button"
                              role="option"
                              aria-selected={checked}
                              onClick={() => toggleMetric(metric)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-100",
                                checked && "text-slate-900",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                                  checked
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-300",
                                )}
                              >
                                {checked && (
                                  <svg
                                    viewBox="0 0 8 8"
                                    className="size-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path d="M1 4l2 2 4-4" />
                                  </svg>
                                )}
                              </div>
                              {formatMetricLabel(metric)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {selectedCount > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-2 py-1.5">
                <span className="text-xs text-slate-500">
                  {selectedCount} selected
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-destructive text-xs hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-destructive flex items-center gap-1.5 text-xs"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}
