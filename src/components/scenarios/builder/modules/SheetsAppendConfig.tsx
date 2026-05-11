"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { FieldMappingPicker } from "./FieldMappingPicker";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";

interface SheetsAppendConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  /** Module type of the previous step, for getting available fields */
  prevStepModuleType?: ModuleType;
}

export function SheetsAppendConfig({
  config,
  onChange,
  errors,
  prevStepModuleType,
}: SheetsAppendConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const mappedFields = Array.isArray(config.mappedFields) ? (config.mappedFields as string[]) : [];

  // Get available output fields from previous step's module — derive from
  // the first sample row (sampleOutput is an array of rows in Phase 1.6).
  const availableFields = React.useMemo(() => {
    if (!prevStepModuleType) return [];
    const mod = getModule(prevStepModuleType);
    if (!mod || mod.sampleOutput.length === 0) return [];
    return Object.keys(mod.sampleOutput[0] ?? {});
  }, [prevStepModuleType]);

  return (
    <div className="space-y-4">
      {/* Spreadsheet ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-append-id">
          Spreadsheet ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The ID from your Google Sheet&apos;s URL: docs.google.com/spreadsheets/d/[THIS-PART]/edit
        </p>
        <Input
          id="sheets-append-id"
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
        <Label htmlFor="sheets-append-tab">
          Tab name
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The exact name of the sheet tab to write to (case-sensitive). It must already exist.
        </p>
        <Input
          id="sheets-append-tab"
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
