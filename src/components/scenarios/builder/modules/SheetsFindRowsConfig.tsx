"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface SheetsFindRowsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function SheetsFindRowsConfig({
  config,
  onChange,
  errors,
}: SheetsFindRowsConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const searchColumn = typeof config.searchColumn === "string" ? config.searchColumn : "";
  const searchValue = typeof config.searchValue === "string" ? config.searchValue : "";

  return (
    <div className="space-y-4">
      {/* Spreadsheet ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-find-id">
          Spreadsheet ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The ID from your Google Sheets URL (between /d/ and /edit)
        </p>
        <Input
          id="sheets-find-id"
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
        <Label htmlFor="sheets-find-tab">
          Tab name
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Name of the sheet tab to search
        </p>
        <Input
          id="sheets-find-tab"
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

      {/* Search column */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-find-column">
          Search column
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Column header to match against (e.g. &quot;email&quot;)
        </p>
        <Input
          id="sheets-find-column"
          type="text"
          placeholder="email"
          value={searchColumn}
          onChange={(e) => onChange({ ...config, searchColumn: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.searchColumn}
        />
        {errors?.searchColumn && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.searchColumn}
          </p>
        )}
      </div>

      {/* Search value */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-find-value">
          Search value
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Value to search for in that column
        </p>
        <Input
          id="sheets-find-value"
          type="text"
          placeholder="alice@example.com"
          value={searchValue}
          onChange={(e) => onChange({ ...config, searchValue: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.searchValue}
        />
        {errors?.searchValue && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.searchValue}
          </p>
        )}
      </div>
    </div>
  );
}
