"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface SheetsDeleteRowConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function SheetsDeleteRowConfig({
  config,
  onChange,
  errors,
}: SheetsDeleteRowConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const rowIdentifier = typeof config.rowIdentifier === "string" ? config.rowIdentifier : "";

  return (
    <div className="space-y-4">
      {/* Spreadsheet ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-delete-id">
          Spreadsheet ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The ID from your Google Sheets URL
        </p>
        <Input
          id="sheets-delete-id"
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
        <Label htmlFor="sheets-delete-tab">
          Tab name
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Name of the sheet tab
        </p>
        <Input
          id="sheets-delete-tab"
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

      {/* Row identifier */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-delete-row">
          Row identifier
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Row number to delete (1-indexed)
        </p>
        <Input
          id="sheets-delete-row"
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

      {/* Destructive action banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200">
        This action cannot be undone. The row will be permanently removed from
        the sheet.
      </div>
    </div>
  );
}
