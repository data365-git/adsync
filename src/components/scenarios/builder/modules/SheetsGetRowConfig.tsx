"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface SheetsGetRowConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function SheetsGetRowConfig({
  config,
  onChange,
  errors,
}: SheetsGetRowConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const rowIndex = typeof config.rowIndex === "number" ? config.rowIndex : "";

  // Local validation: rowIndex must be >= 2
  const rowIndexNum = typeof rowIndex === "number" ? rowIndex : NaN;
  const rowIndexError =
    errors?.rowIndex ??
    (!isNaN(rowIndexNum) && rowIndexNum < 2
      ? "Row index must be 2 or higher (row 1 is the header row)"
      : undefined);

  return (
    <div className="space-y-4">
      {/* Spreadsheet ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-get-id">
          Spreadsheet ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The ID from your Google Sheets URL
        </p>
        <Input
          id="sheets-get-id"
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
        <Label htmlFor="sheets-get-tab">
          Tab name
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Name of the sheet tab
        </p>
        <Input
          id="sheets-get-tab"
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

      {/* Row index */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-get-row">
          Row index
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Row number to retrieve (1-indexed; row 1 is the header row)
        </p>
        <Input
          id="sheets-get-row"
          type="number"
          min={2}
          placeholder="2"
          value={rowIndex === "" ? "" : rowIndex}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChange({ ...config, rowIndex: val });
            } else {
              // Clear the value if the field is emptied
              onChange(Object.fromEntries(Object.entries(config).filter(([k]) => k !== "rowIndex")));
            }
          }}
          aria-required="true"
          aria-invalid={!!rowIndexError}
          className="w-28"
        />
        {rowIndexError && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {rowIndexError}
          </p>
        )}
      </div>
    </div>
  );
}
