"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface AddStepButtonProps {
  /** Position to insert the new step BEFORE (1-based, or steps.length+1 to append) */
  insertAtPosition: number;
  onClick: (insertAtPosition: number) => void;
  label?: string;
}

/**
 * Always visible — muted at rest, full opacity on hover/focus.
 * Resting opacity raised from the original 30% to 70% so the visible label
 * meets WCAG AA 4.5:1 contrast (axe-core/wcag2aa). Discovery beats minimalism;
 * hard-to-read beats easy-to-read.
 */
export function AddStepButton({
  insertAtPosition,
  onClick,
  label,
}: AddStepButtonProps) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <button
        type="button"
        onClick={() => onClick(insertAtPosition)}
        className={cn(
          "group border-border flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5",
          "text-foreground text-xs font-medium",
          "opacity-70 transition-opacity duration-150",
          "hover:opacity-100 focus-visible:opacity-100",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        )}
        aria-label={label ?? `Add step at position ${insertAtPosition}`}
      >
        <PlusIcon className="size-3.5 transition-transform group-hover:rotate-90" />
        Add step
      </button>
    </div>
  );
}
