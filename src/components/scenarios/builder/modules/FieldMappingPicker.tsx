"use client";

import * as React from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import type { ModuleType } from "~/server/mocks/types";
import { moduleProducesArray } from "../stepUtils";

interface FieldMappingPickerProps {
  /** Available output fields from the previous step */
  availableFields: string[];
  /** Currently selected fields */
  value: string[];
  onChange: (fields: string[]) => void;
  error?: string;
  /**
   * Agent C — when provided, the component checks whether the upstream step
   * produces an array. If so, field keys are prefixed with `item.` and a
   * context notice is rendered above the field list.
   */
  prevStepModuleType?: ModuleType;
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
  prevStepModuleType,
}: FieldMappingPickerProps) {
  // Agent C — when upstream step outputs an array, prefix every key with item.
  const isIterator =
    prevStepModuleType !== undefined && moduleProducesArray(prevStepModuleType);

  // Displayed keys may have the item. prefix; the value array stores them
  // with the prefix too so the saved config reflects the actual reference.
  const displayedFields = isIterator
    ? availableFields.map((f) => `item.${f}`)
    : availableFields;

  const allSelected =
    displayedFields.length > 0 && displayedFields.every((f) => value.includes(f));
  const someSelected = displayedFields.some((f) => value.includes(f));

  function handleToggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([...displayedFields]);
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
      {/* Agent C — iterator context notice */}
      {isIterator && (
        <p className="text-xs text-muted-foreground mb-2 px-1">
          Fields are prefixed with{" "}
          <code className="text-xs bg-muted px-1 rounded">item.</code> — this
          step runs once per row from the upstream list.
        </p>
      )}

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
          {value.filter((f) => displayedFields.includes(f)).length}/{displayedFields.length}
        </span>
      </div>

      {/* Field list */}
      <div
        className="space-y-1 rounded-lg border border-border bg-card p-2"
        role="group"
        aria-label="Field mapping checkboxes"
      >
        {displayedFields.map((field) => {
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
