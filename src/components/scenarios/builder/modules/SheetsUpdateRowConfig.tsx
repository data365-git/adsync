"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { api } from "~/trpc/react";
import type { ModuleType } from "~/server/mocks/types";
import { SheetsLocationPicker } from "./SheetsLocationPicker";

interface SheetsUpdateRowConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepModuleType?: ModuleType;
}

/** Coerce legacy string[] config into Record<string, string>. */
function toMappedFieldsRecord(raw: unknown): Record<string, string> {
  if (Array.isArray(raw)) {
    const result: Record<string, string> = {};
    for (const f of raw as string[]) result[f] = "";
    return result;
  }
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  return {};
}

export function SheetsUpdateRowConfig({
  config,
  onChange,
  errors,
  prevStepModuleType: _prevStepModuleType,
}: SheetsUpdateRowConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const rowIdentifier = typeof config.rowIdentifier === "string" ? config.rowIdentifier : "";
  // Unified shape: mappedFields is Record<column, valueExpr>
  const mappedFields = toMappedFieldsRecord(config.mappedFields);
  const pickedColumns = Object.keys(mappedFields);

  // ── Columns (dependent on spreadsheetId + tabName) ────────────
  const {
    data: columns,
    isLoading: columnsLoading,
    isError: columnsError,
    refetch: refetchColumns,
  } = api.connections.listSheetColumns.useQuery(
    { spreadsheetId, tabName },
    { enabled: spreadsheetId.length > 0 && tabName.length > 0, staleTime: 60_000 },
  );

  function handleColumnToggle(col: string) {
    const next = { ...mappedFields };
    if (col in next) {
      delete next[col];
    } else {
      next[col] = "";
    }
    onChange({ ...config, mappedFields: next });
  }

  function handleValueExprChange(col: string, val: string) {
    onChange({ ...config, mappedFields: { ...mappedFields, [col]: val } });
  }

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
            mappedFields: {},
          })
        }
        onTabChange={(nextTabName) =>
          onChange({ ...config, tabName: nextTabName, mappedFields: {} })
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

      {/* Field mapping — live columns with per-column value expression */}
      {spreadsheetId && tabName && (
        <div className="space-y-1.5">
          <Label>
            Fields to update
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Pick columns and enter a value or a token like{" "}
            <code className="text-xs bg-muted px-1 rounded">{"{{name}}"}</code> for each.
          </p>
          {columnsError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <span aria-hidden="true">&#x26A0;</span>
              Could not load columns —{" "}
              <button
                type="button"
                className="underline hover:text-destructive/80"
                onClick={() => void refetchColumns()}
              >
                Retry
              </button>
            </div>
          ) : columnsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 w-full animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : !columns || columns.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No header row found in this tab. Add column headers to the first row in Sheets and
              retry.
            </p>
          ) : (
            <div className="space-y-2 rounded-lg border border-border bg-card p-2">
              {columns.map((col) => {
                const checked = pickedColumns.includes(col);
                return (
                  <div key={col} className="flex items-center gap-2">
                    <Checkbox
                      id={`update-col-${col}`}
                      checked={checked}
                      onCheckedChange={() => handleColumnToggle(col)}
                    />
                    <label
                      htmlFor={`update-col-${col}`}
                      className="w-28 shrink-0 cursor-pointer truncate text-sm font-mono"
                      title={col}
                    >
                      {col}
                    </label>
                    {checked && (
                      <Input
                        type="text"
                        placeholder={`{{${col}}}`}
                        value={mappedFields[col] ?? ""}
                        onChange={(e) => handleValueExprChange(col, e.target.value)}
                        className="h-7 text-xs"
                        aria-label={`Value expression for ${col}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {errors?.mappedFields && (
            <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
              <span aria-hidden="true">&#x26A0;</span>
              {errors.mappedFields}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
