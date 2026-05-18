"use client";

import * as React from "react";

import { cn } from "~/lib/utils";
import { getIntegrationMeta } from "~/lib/integration-icons";
import { useUpstreamValues } from "./UpstreamValuesContext";
import type { UpstreamCatalogStep } from "./upstream-catalog";

type UpstreamValuesPanelProps = {
  catalog: UpstreamCatalogStep[];
  className?: string;
};

function truncate(value: string | null): string {
  if (!value) return "";
  return value.length > 40 ? `${value.slice(0, 40)}...` : value;
}

export function UpstreamValuesPanel({
  catalog,
  className,
}: UpstreamValuesPanelProps) {
  const valuesContext = useUpstreamValues();

  if (catalog.length === 0) {
    return (
      <aside className={cn("rounded-lg border border-border bg-muted/20 p-4", className)}>
        <p className="text-sm font-medium">Values from previous steps</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Run or configure an upstream step to preview values here.
        </p>
      </aside>
    );
  }

  return (
    <aside className={cn("space-y-3 overflow-y-auto", className)}>
      <div>
        <p className="text-sm font-medium">Values from previous steps</p>
        <p className="text-xs text-muted-foreground">
          Click a value to insert its token.
        </p>
      </div>
      {catalog.map((step) => {
        const { Icon, tileBg, iconColor } = getIntegrationMeta(step.moduleType);
        return (
          <section key={step.stepId} className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span
                className={cn("flex size-7 items-center justify-center rounded-md", tileBg)}
                aria-hidden="true"
              >
                <Icon className={cn("size-4", iconColor)} />
              </span>
              <p className="min-w-0 truncate text-sm font-medium">{step.label}</p>
            </div>
            <div className="divide-y divide-border/70">
              {step.fields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className="grid w-full grid-cols-[minmax(72px,0.8fr)_minmax(0,1.2fr)] gap-2 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() => valuesContext?.insertAtFocused(`{{${field.key}}}`)}
                  title={`${field.key} = ${field.sampleValue ?? ""}`}
                >
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {field.key}
                  </span>
                  <span className="truncate text-xs">
                    {truncate(field.sampleValue)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
