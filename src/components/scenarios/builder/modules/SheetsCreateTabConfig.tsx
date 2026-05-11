"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

// Characters forbidden in Google Sheets tab names
const INVALID_TAB_NAME_RE = /[/[\]*?:\\]/;

interface SheetsCreateTabConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function SheetsCreateTabConfig({
  config,
  onChange,
  errors,
}: SheetsCreateTabConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const newTabName = typeof config.newTabName === "string" ? config.newTabName : "";
  const headerRow = typeof config.headerRow === "string" ? config.headerRow : "";

  const tabNameInvalid = newTabName.length > 0 && INVALID_TAB_NAME_RE.test(newTabName);
  const tabNameError =
    errors?.newTabName ??
    (tabNameInvalid ? "Tab name contains invalid characters ( / [ ] * ? : \\ )" : undefined);

  return (
    <div className="space-y-4">
      {/* Spreadsheet ID */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-create-tab-id">
          Spreadsheet ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The ID from your Google Sheets URL
        </p>
        <Input
          id="sheets-create-tab-id"
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

      {/* New tab name */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-create-tab-name">
          New tab name
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Name for the new sheet tab (must be unique; avoid / [ ] * ? : \)
        </p>
        <Input
          id="sheets-create-tab-name"
          type="text"
          placeholder="Leads_2025"
          value={newTabName}
          onChange={(e) => onChange({ ...config, newTabName: e.target.value })}
          aria-required="true"
          aria-invalid={!!tabNameError}
        />
        {tabNameError && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {tabNameError}
          </p>
        )}
      </div>

      {/* Header row */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-create-tab-header">Header row</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Optional. Comma-separated column headers (e.g. &quot;id,name,email,createdAt&quot;)
        </p>
        <Input
          id="sheets-create-tab-header"
          type="text"
          placeholder="id,name,email,createdAt"
          value={headerRow}
          onChange={(e) => onChange({ ...config, headerRow: e.target.value })}
        />
      </div>
    </div>
  );
}
