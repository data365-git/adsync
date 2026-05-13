"use client";

import * as React from "react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "~/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  /**
   * Optional brand/category icon shown to the left of the title in a small
   * tinted tile. Pass the component itself (not an element) — e.g. `FacebookIcon`.
   */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tailwind class for the icon tile's background, e.g. "bg-fb-blue/10" */
  tileBg?: string;
  /** Tailwind class for the icon's color, e.g. "text-fb-blue" */
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  Icon,
  tileBg = "bg-muted",
  iconColor = "text-foreground/70",
  children,
  className,
}: FormSectionProps) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className={cn("space-y-5", className)} aria-labelledby={id}>
      <div className="border-border flex items-start gap-3 border-b pb-4">
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              tileBg,
            )}
            aria-hidden="true"
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-lg tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
