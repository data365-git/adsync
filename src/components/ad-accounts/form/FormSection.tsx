"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn("space-y-4", className)}
      aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="border-b border-border pb-3">
        <h2
          id={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
          className="text-base font-semibold leading-none tracking-tight"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
