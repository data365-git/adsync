"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { useUpstreamValues } from "./UpstreamValuesContext";
import { getIntegrationMeta } from "~/lib/integration-icons";
import type { UpstreamCatalogStep } from "./upstream-catalog";

type UpstreamValuesPanelProps = {
  catalog: UpstreamCatalogStep[];
  className?: string;
};

/** Tooltip text for a chip: "key = sample" or "key (no sample)" */
function chipTitle(key: string, sampleValue: string | null): string {
  if (!sampleValue || sampleValue.trim().toLowerCase() === key.trim().toLowerCase()) {
    return `${key} (no sample)`;
  }
  const cleaned = sampleValue.replace(/\n/g, "↵");
  const truncated = cleaned.length > 60 ? `${cleaned.slice(0, 60)}…` : cleaned;
  return `${key} = ${truncated}`;
}

// ── Individual draggable chip ──────────────────────────────────────────────

type ChipProps = {
  fieldKey: string;
  sampleValue: string | null;
  stepLabel: string;
  onInsert: (token: string) => void;
};

function Chip({ fieldKey, sampleValue, stepLabel, onInsert }: ChipProps) {
  const [dragging, setDragging] = React.useState(false);
  const token = `{{${fieldKey}}}`;

  return (
    <button
      key={fieldKey}
      type="button"
      draggable
      aria-label={`Insert ${fieldKey} from ${stepLabel}`}
      title={chipTitle(fieldKey, sampleValue)}
      onClick={() => onInsert(token)}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", token);
        e.dataTransfer.effectAllowed = "copy";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5",
        "border border-transparent",
        "bg-emerald-100 text-emerald-800",
        "dark:bg-emerald-900/40 dark:text-emerald-300",
        "text-xs font-medium leading-none",
        "cursor-grab transition-all duration-150",
        "hover:border-emerald-500 hover:-translate-y-px hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
        dragging && "scale-95 opacity-60",
      )}
      data-dragging={dragging ? "true" : undefined}
    >
      {fieldKey}
      <span className="sr-only">Draggable</span>
    </button>
  );
}

export function UpstreamValuesPanel({
  catalog,
  className,
}: UpstreamValuesPanelProps) {
  const valuesContext = useUpstreamValues();
  const [query, setQuery] = React.useState("");

  // ── Empty state (no upstream steps at all) ─────────────────────────────────
  if (catalog.length === 0) {
    return (
      <aside
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-border bg-muted/40 dark:bg-muted/20 p-4",
          className,
        )}
      >
        <p className="border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Values from previous steps
        </p>
        <p className="text-xs text-muted-foreground">
          Run or configure an upstream step to preview values here.
        </p>
      </aside>
    );
  }

  // ── Filter catalog by search query ─────────────────────────────────────────
  const lowerQuery = query.toLowerCase();
  const filteredCatalog: UpstreamCatalogStep[] = catalog
    .map((step) => {
      const labelMatches = step.label.toLowerCase().includes(lowerQuery);
      const matchedFields = labelMatches
        ? step.fields
        : step.fields.filter((f) =>
            f.key.toLowerCase().includes(lowerQuery),
          );
      return { ...step, fields: matchedFields };
    })
    .filter((step) => step.fields.length > 0);

  const hasResults = filteredCatalog.length > 0;

  return (
    <aside className={cn("flex flex-col overflow-hidden", className)}>
      {/* Panel header */}
      <div className="shrink-0 pb-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Values from previous steps
        </p>

        {/* Search input with icon + clear */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search values…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search upstream values"
            className={cn(
              "h-9 w-full rounded-md border border-input pl-9 pr-8 text-xs",
              "bg-muted/30 transition-colors outline-none",
              "focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-emerald-500",
              "placeholder:text-muted-foreground",
            )}
          />
          {query.length > 0 ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Usage hint */}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Drag a value into a field, or click to insert.
        </p>
      </div>

      {/* Scrollable chip area */}
      <div className="flex-1 overflow-y-auto">
        {!hasResults ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No matches
          </p>
        ) : (
          filteredCatalog.map((step) => {
            const { Icon, iconColor, tileBg } = getIntegrationMeta(step.moduleType);
            return (
              <div
                key={step.stepId}
                className="mb-2 pb-3 border-b border-border/60 last:border-b-0 last:pb-0"
              >
                {/* Section header — sticky, semibold, red with brand icon */}
                <h4
                  className={cn(
                    "sticky top-0 z-10 flex items-center gap-1.5 pb-2 pt-0.5",
                    "bg-muted/40 dark:bg-muted/20",
                    "text-xs font-semibold leading-snug",
                    "text-red-700 dark:text-red-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                      tileBg,
                    )}
                  >
                    <Icon className={cn("size-3", iconColor)} aria-hidden="true" />
                  </span>
                  {step.label}
                </h4>

                {/* Chip cloud */}
                <div className="flex flex-wrap gap-1.5">
                  {step.fields.map((field) => (
                    <Chip
                      key={field.key}
                      fieldKey={field.key}
                      sampleValue={field.sampleValue}
                      stepLabel={step.label}
                      onInsert={(token) => valuesContext?.insertAtFocused(token)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
