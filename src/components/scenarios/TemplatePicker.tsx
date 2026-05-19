"use client";

import * as React from "react";
import {
  ChevronRightIcon,
  FilePlus2Icon,
  LayoutTemplateIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

export interface TemplatePickerOption {
  id: string;
  name: string;
  description: string;
}

interface TemplatePickerProps {
  templates: TemplatePickerOption[];
  isLoading?: boolean;
  onPickTemplate: (templateId: string) => void;
  onStartScratch: () => void;
}

export function TemplatePicker({
  templates,
  isLoading,
  onPickTemplate,
  onStartScratch,
}: TemplatePickerProps) {
  return (
    <section
      className="mx-auto max-w-3xl px-4 pt-6"
      aria-labelledby="template-picker-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <LayoutTemplateIcon
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 id="template-picker-heading" className="text-base text-foreground">
          Start from a template
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[112px] rounded-xl border border-border bg-muted/20 motion-safe:animate-pulse motion-reduce:opacity-70"
              />
            ))
          : templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onPickTemplate(tpl.id)}
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left",
                  "transition-colors hover:border-primary/40 hover:bg-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="text-sm font-medium text-foreground">
                  {tpl.name}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {tpl.description}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary">
                  Use template
                  <ChevronRightIcon className="size-3" aria-hidden="true" />
                </span>
              </button>
            ))}

        {!isLoading && (
          <button
            type="button"
            onClick={onStartScratch}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-muted/10 p-4 text-left",
              "transition-colors hover:border-primary/40 hover:bg-primary/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <FilePlus2Icon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-foreground">
              Blank scenario
            </span>
            <span className="text-xs text-muted-foreground">
              Start with an empty trigger; pick everything yourself.
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
