"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { FieldMappingPicker } from "./FieldMappingPicker";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";
import { SheetsLocationPicker } from "./SheetsLocationPicker";

interface SheetsUpdateRowConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepModuleType?: ModuleType;
}

export function SheetsUpdateRowConfig({
  config,
  onChange,
  errors,
  prevStepModuleType,
}: SheetsUpdateRowConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const rowIdentifier = typeof config.rowIdentifier === "string" ? config.rowIdentifier : "";
  const mappedFields = Array.isArray(config.mappedFields) ? (config.mappedFields as string[]) : [];

  const availableFields = React.useMemo(() => {
    if (!prevStepModuleType) return [];
    const mod = getModule(prevStepModuleType);
    if (!mod || mod.sampleOutput.length === 0) return [];
    return Object.keys(mod.sampleOutput[0] ?? {});
  }, [prevStepModuleType]);

  return (
    <div className="space-y-4">
      <SheetsLocationPicker
        spreadsheetId={spreadsheetId}
        tabName={tabName}
        spreadsheetError={errors?.spreadsheetId}
        tabError={errors?.tabName}
        ids={{
          spreadsheet: "sheets-update-id",
          tab: "sheets-update-tab",
        }}
        onSpreadsheetChange={(nextSpreadsheetId) =>
          onChange({
            ...config,
            spreadsheetId: nextSpreadsheetId,
            tabName: "",
            mappedFields: [],
          })
        }
        onTabChange={(nextTabName) =>
          onChange({ ...config, tabName: nextTabName, mappedFields: [] })
        }
      />

      {/* Row identifier */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-update-row">
          Row identifier
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Row number (e.g. &quot;3&quot;) OR key column + value (e.g. &quot;id=42&quot;)
        </p>
        <Input
          id="sheets-update-row"
          type="text"
          placeholder="3"
          value={rowIdentifier}
          onChange={(e) => onChange({ ...config, rowIdentifier: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.rowIdentifier}
        />
        {errors?.rowIdentifier && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.rowIdentifier}
          </p>
        )}
      </div>

      {/* Field mapping */}
      <div className="space-y-1.5">
        <Label>
          Fields to update
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Map column headers to values from upstream steps
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
