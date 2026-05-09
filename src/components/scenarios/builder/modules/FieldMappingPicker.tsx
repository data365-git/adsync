"use client";

import * as React from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";

interface FieldMappingPickerProps {
  /** Available output fields from the previous step */
  availableFields: string[];
  /** Currently selected fields */
  value: string[];
  onChange: (fields: string[]) => void;
  error?: string;
}

function formatFieldLabel(field: string): string {
  return field
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function FieldMappingPicker({
  availableFields,
  value,
  onChange,
  error,
}: FieldMappingPickerProps) {
  const allSelected = availableFields.length > 0 && availableFields.every((f) => value.includes(f));
  const someSelected = availableFields.some((f) => value.includes(f));

  function handleToggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([...availableFields]);
    }
  }

  function handleToggleField(field: string) {
    if (value.includes(field)) {
      onChange(value.filter((f) => f !== field));
    } else {
      onChange([...value, field]);
    }
  }

  if (availableFields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No output fields available from the previous step.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Select all toggle */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <Checkbox
          id="field-select-all"
          checked={allSelected}
          indeterminate={!allSelected && someSelected}
          onCheckedChange={handleToggleAll}
          aria-label="Select all visible fields"
        />
        <label
          htmlFor="field-select-all"
          className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none"
        >
          {allSelected ? "Deselect all" : "Select all visible"}
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {value.filter((f) => availableFields.includes(f)).length}/{availableFields.length}
        </span>
      </div>

      {/* Field list */}
      <div
        className="space-y-1 rounded-lg border border-border bg-card p-2"
        role="group"
        aria-label="Field mapping checkboxes"
      >
        {availableFields.map((field) => {
          const checked = value.includes(field);
          return (
            <div key={field} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
              <Checkbox
                id={`field-${field}`}
                checked={checked}
                onCheckedChange={() => handleToggleField(field)}
              />
              <Label
                htmlFor={`field-${field}`}
                className="cursor-pointer text-sm font-normal"
              >
                {formatFieldLabel(field)}
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {field}
                </span>
              </Label>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}
