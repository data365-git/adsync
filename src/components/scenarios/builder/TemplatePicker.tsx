"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { SCENARIO_TEMPLATES } from "~/lib/scenario-templates";
import { getIntegrationMeta } from "~/lib/integration-icons";
import { cn } from "~/lib/utils";
import type { ModuleType } from "~/server/mocks/types";

interface TemplatePickerProps {
  /** If set, auto-navigate to builder with this template pre-selected */
  selectedTemplateId?: string;
}

export function TemplatePicker({ selectedTemplateId: _selectedTemplateId }: TemplatePickerProps) {
  const router = useRouter();

  function handleSelectTemplate(templateId: string) {
    router.push(`/scenarios/new?template=${templateId}`);
  }

  function handleFromScratch() {
    // ?template=scratch tells /scenarios/new to render the empty builder
    // instead of looping back to the template picker. Do NOT change this route.
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

      {/* 2-col grid: 3 template cards + 1 scratch card */}
      <div
        className="grid grid-cols-2 gap-4"
        role="list"
        aria-label="Scenario templates"
      >
        {SCENARIO_TEMPLATES.map((template) => {
          const partial = template.factory();
          const steps = partial.steps;
          const stepCount = steps.length;

          // Derive brand from the TERMINAL (last) action step
          const lastStep = steps[steps.length - 1];
          const lastModuleType = lastStep?.moduleType as ModuleType | undefined;
          const meta = lastModuleType ? getIntegrationMeta(lastModuleType) : null;

          return (
            <button
              key={template.id}
              type="button"
              role="listitem"
              onClick={() => handleSelectTemplate(template.id)}
              className={cn(
                "group flex min-h-[160px] w-full flex-col rounded-xl border px-4 py-4 text-left",
                "transition-all duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "border-border bg-card hover:border-primary/40 hover:shadow-sm",
              )}
              aria-label={`Use template: ${template.name}`}
            >
              {/* Brand tile */}
              {meta && (
                <div
                  className={cn(
                    "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                    meta.tileBg,
                  )}
                >
                  <meta.Icon className={cn("h-4 w-4", meta.iconColor)} />
                </div>
              )}

              {/* Title + step badge */}
              <div className="mb-1.5 flex items-center gap-2">
                <p className="text-sm font-semibold leading-snug">{template.name}</p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {stepCount} step{stepCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Description */}
              <p className="mt-auto text-xs text-muted-foreground line-clamp-3">
                {template.description}
              </p>
            </button>
          );
        })}

        {/* "Build from scratch" — equal-weight 4th card */}
        <button
          type="button"
          role="listitem"
          onClick={handleFromScratch}
          className={cn(
            "group flex min-h-[160px] w-full flex-col rounded-xl border-2 border-dashed px-4 py-4 text-left",
            "transition-all duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "border-border bg-transparent hover:border-primary/40 hover:shadow-sm",
          )}
          aria-label="Build from scratch without a template"
        >
          {/* Muted plus tile */}
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <PlusIcon className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Title */}
          <p className="mb-1.5 text-sm font-semibold leading-snug">
            Build from scratch
          </p>

          {/* Description */}
          <p className="mt-auto text-xs text-muted-foreground">
            Start with an empty scenario and add steps yourself.
          </p>
        </button>
      </div>
    </div>
  );
}
