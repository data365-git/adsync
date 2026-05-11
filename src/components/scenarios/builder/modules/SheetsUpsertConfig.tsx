"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { FieldMappingPicker } from "./FieldMappingPicker";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";
import { XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

interface SheetsUpsertConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepModuleType?: ModuleType;
}

export function SheetsUpsertConfig({
  config,
  onChange,
  errors,
  prevStepModuleType,
}: SheetsUpsertConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const keyFields = Array.isArray(config.keyFields) ? (config.keyFields as string[]) : [];
  const mappedFields = Array.isArray(config.mappedFields) ? (config.mappedFields as string[]) : [];

  // Derive available output fields from the previous step's first sample row
  // (sampleOutput is an array of rows in Phase 1.6).
  const availableFields = React.useMemo(() => {
    if (!prevStepModuleType) return [];
    const mod = getModule(prevStepModuleType);
    if (!mod || mod.sampleOutput.length === 0) return [];
    return Object.keys(mod.sampleOutput[0] ?? {});
  }, [prevStepModuleType]);

  const [keyFieldInput, setKeyFieldInput] = React.useState("");

  function addKeyField() {
    const val = keyFieldInput.trim();
    if (val && !keyFields.includes(val)) {
      onChange({ ...config, keyFields: [...keyFields, val] });
    }
    setKeyFieldInput("");
  }

  function removeKeyField(field: string) {
    onChange({ ...config, keyFields: keyFields.filter((f) => f !== field) });
  }

  return (
    <div className="space-y-4">
      {/* Spreadsheet ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-upsert-id">
          Spreadsheet ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The ID from your Google Sheet&apos;s URL: docs.google.com/spreadsheets/d/[THIS-PART]/edit
        </p>
        <Input
          id="sheets-upsert-id"
          type="text"
          placeholder="1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV"
          value={spreadsheetId}
          onChange={(e) => onChange({ ...config, spreadsheetId: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.spreadsheetId}
        />
        {errors?.spreadsheetId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.spreadsheetId}
          </p>
        )}
      </div>

      {/* Tab name */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-upsert-tab">
          Tab name
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The exact name of the sheet tab to write to (case-sensitive). It must already exist.
        </p>
        <Input
          id="sheets-upsert-tab"
          type="text"
          placeholder="Sheet1"
          value={tabName}
          onChange={(e) => onChange({ ...config, tabName: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.tabName}
        />
        {errors?.tabName && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.tabName}
          </p>
        )}
      </div>

      {/* Key fields */}
      <div className="space-y-1.5">
        <Label>
          Key fields
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Fields that uniquely identify a row. If a row with the same key values already exists, it will be updated rather than added.
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="date"
            value={keyFieldInput}
            onChange={(e) => setKeyFieldInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyField();
              }
            }}
            aria-label="Add key field"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addKeyField}
            disabled={!keyFieldInput.trim()}
          >
            Add
          </Button>
        </div>
        {keyFields.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keyFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                <code className="font-mono">{field}</code>
                <button
                  type="button"
                  onClick={() => removeKeyField(field)}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label={`Remove key field ${field}`}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors?.keyFields && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.keyFields}
          </p>
        )}
      </div>

      {/* Field mapping */}
      <div className="space-y-1.5">
        <Label>
          Fields to write
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Choose which fields from the previous step to write as columns. The column header in Sheets will match the field name.
        </p>
        <FieldMappingPicker
          availableFields={availableFields}
          value={mappedFields}
          onChange={(fields) => onChange({ ...config, mappedFields: fields })}
          error={errors?.mappedFields}
        />
      </div>
    </div>
  );
}
