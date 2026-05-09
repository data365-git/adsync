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
          aria-invalid={!!error}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-lg border bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            error
              ? "border-destructive ring-3 ring-destructive/20"
              : "border-input hover:bg-muted/50",
            open ? "border-ring ring-3 ring-ring/50" : "",
          )}
        >
          <span className="flex items-center gap-2">
            {selectedCount > 0 ? (
              <>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {selectedCount}
                </span>
                <span className="text-sm">
                  {selectedCount === 1 ? "metric" : "metrics"} selected
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Select metrics…</span>
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0">
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
                className="rounded p-0.5 hover:bg-muted"
              >
                <XIcon className="size-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-md">
            {/* Search input */}
            <div className="border-b border-border px-2 py-1.5">
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
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
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
                        onClick={() => toggleGroup(group as MetricGroup)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted"
                      >
                        <div
                          className={cn(
                            "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                            allSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : someSelected
                                ? "border-primary bg-primary/20"
                                : "border-input",
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
                            <span className="block h-px w-2 bg-primary" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
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
                                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted",
                                checked && "text-foreground",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                                  checked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input",
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
              <div className="border-t border-border px-2 py-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selectedCount} selected
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-destructive hover:underline"
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
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}
