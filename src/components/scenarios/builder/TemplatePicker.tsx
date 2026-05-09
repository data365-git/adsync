"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, LayersIcon } from "lucide-react";
import { SCENARIO_TEMPLATES } from "~/lib/scenario-templates";
import { cn } from "~/lib/utils";

interface TemplatePickerProps {
  /** If set, auto-navigate to builder with this template pre-selected */
  selectedTemplateId?: string;
}

export function TemplatePicker({ selectedTemplateId: _selectedTemplateId }: TemplatePickerProps) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  function handleSelectTemplate(templateId: string) {
    router.push(`/scenarios/new?template=${templateId}`);
  }

  function handleFromScratch() {
    // ?template=scratch tells /scenarios/new to render the empty builder
    // instead of looping back to the template picker.
    router.push("/scenarios/new?template=scratch");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold">New scenario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start from a template or build from scratch.
        </p>
      </div>

      {/* Template cards */}
      <div className="space-y-3" role="list" aria-label="Scenario templates">
        {SCENARIO_TEMPLATES.map((template) => {
          const partial = template.factory();
          const stepCount = partial.steps.length;

          return (
            <button
              key={template.id}
              type="button"
              role="listitem"
              onClick={() => handleSelectTemplate(template.id)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "group relative w-full rounded-xl border px-4 py-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                hoveredId === template.id
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
              )}
              aria-label={`Use template: ${template.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <LayersIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{template.name}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {stepCount} step{stepCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* From scratch link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleFromScratch}
          className="text-sm text-muted-foreground underline-offset-3 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          aria-label="Build from scratch without a template"
        >
          Build from scratch →
        </button>
      </div>
    </div>
  );
}
