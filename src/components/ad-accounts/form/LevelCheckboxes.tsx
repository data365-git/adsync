"use client";

import * as React from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import type { Level } from "./schema";

interface LevelCheckboxesProps {
  value: Level[];
  onChange: (levels: Level[]) => void;
  error?: string;
  onBlur?: () => void;
}

const LEVELS: { value: Level; label: string; description: string }[] = [
  {
    value: "CAMPAIGN",
    label: "Campaign",
    description: "Sync data at the campaign level",
  },
  {
    value: "AD",
    label: "Ad",
    description: "Sync data at the individual ad level",
  },
];

export function LevelCheckboxes({
  value,
  onChange,
  error,
  onBlur,
}: LevelCheckboxesProps) {
  function handleToggle(level: Level) {
    const next = value.includes(level)
      ? value.filter((l) => l !== level)
      : [...value, level];
    onChange(next);
  }

  return (
    <div className="space-y-1">
      <div
        className="flex flex-wrap gap-3"
        role="group"
        aria-label="Sync levels"
      >
        {LEVELS.map((lvl) => {
          const checked = value.includes(lvl.value);
          return (
            <label
              key={lvl.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                checked
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-transparent hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => {
                  handleToggle(lvl.value);
                  onBlur?.();
                }}
                aria-label={lvl.label}
              />
              <div>
                <span className="text-sm font-medium">{lvl.label}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {lvl.description}
                </span>
              </div>
            </label>
          );
        })}
      </div>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}
