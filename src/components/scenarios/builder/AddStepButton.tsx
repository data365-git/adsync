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
 * Always visible at ~30% opacity, full opacity on hover/focus.
 * This ensures new users discover how to add steps.
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
          "group flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5",
          "text-xs font-medium text-muted-foreground",
          "opacity-30 transition-opacity duration-150",
          "hover:opacity-100 focus-visible:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
        aria-label={label ?? `Add step at position ${insertAtPosition}`}
      >
        <PlusIcon className="size-3.5 transition-transform group-hover:rotate-90" />
        Add step
      </button>
    </div>
  );
}
