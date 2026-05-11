"use client";

import * as React from "react";
import { RefreshCwIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface IteratorBadgeProps {
  /**
   * When provided, appends " · will run N×" to the badge label.
   * Omit (or pass undefined) to show the base label only.
   */
  runCount?: number;
  className?: string;
}

/**
 * Slate pill shown on step cards whose immediately-upstream step outputs an
 * array. Signals that this step will execute once per item in that array.
 */
export function IteratorBadge({ runCount, className }: IteratorBadgeProps) {
  const label =
    runCount !== undefined
      ? `Iterates per item · will run ${runCount}×`
      : "Iterates per item";

  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        "bg-slate-100 px-2 py-0.5 dark:bg-slate-800",
        "text-[10px] font-medium text-slate-600 dark:text-slate-300",
        className,
      )}
    >
      <RefreshCwIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
