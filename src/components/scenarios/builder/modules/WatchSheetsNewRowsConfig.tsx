"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { getModule } from "~/lib/modules";

interface WatchSheetsNewRowsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

function field(config: Record<string, unknown>, key: string): string {
  const v = config[key];
  return typeof v === "string" ? v : "";
}

// ── Sample tab derived from the trigger.watch.sheets_new_rows module definition
function SampleOutput() {
  const mod = getModule("trigger.watch.sheets_new_rows");
  const sample = mod?.sampleOutput[0] ?? {};
  const entries = Object.entries(sample);

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Sample output (first row)
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {entries.map(([k]) => (
                <th key={k} className="px-3 py-2 text-left font-mono font-medium text-muted-foreground">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {entries.map(([k, v]) => (
                <td key={k} className="px-3 py-2 font-mono">
                  {typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WatchSheetsNewRowsConfig({
  config,
  onChange,
  errors,
}: WatchSheetsNewRowsConfigProps) {
  function set(key: string, value: string) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-4">
      {/* Polling info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
        Polling interval: every 5 minutes. Real polling is wired in Phase 4.
      </div>

      {/* spreadsheetId */}
      <div className="space-y-1.5">
        <Label htmlFor="ws-spreadsheetId">
          Spreadsheet ID <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          The ID from your Google Sheets URL (between /d/ and /edit)
        </p>
        <Input
          id="ws-spreadsheetId"
          value={field(config, "spreadsheetId")}
          onChange={(e) => set("spreadsheetId", e.target.value)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          aria-describedby={errors?.spreadsheetId ? "ws-spreadsheetId-err" : undefined}
          aria-invalid={!!errors?.spreadsheetId}
        />
        {errors?.spreadsheetId && (
          <p
            id="ws-spreadsheetId-err"
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <span aria-hidden="true">&#x26A0;</span>
            {errors.spreadsheetId}
          </p>
        )}
      </div>

      {/* tabName */}
      <div className="space-y-1.5">
        <Label htmlFor="ws-tabName">
          Tab name <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Name of the sheet tab to watch for new rows
        </p>
        <Input
          id="ws-tabName"
          value={field(config, "tabName")}
          onChange={(e) => set("tabName", e.target.value)}
          placeholder="Sheet1"
          aria-describedby={errors?.tabName ? "ws-tabName-err" : undefined}
          aria-invalid={!!errors?.tabName}
        />
        {errors?.tabName && (
          <p
            id="ws-tabName-err"
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <span aria-hidden="true">&#x26A0;</span>
            {errors.tabName}
          </p>
        )}
      </div>

      {/* watchColumn */}
      <div className="space-y-1.5">
        <Label htmlFor="ws-watchColumn">
          Watch column <span aria-hidden="true" className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Column header used to detect new rows (e.g. &quot;id&quot;). Values must be unique per row.
        </p>
        <Input
          id="ws-watchColumn"
          value={field(config, "watchColumn")}
          onChange={(e) => set("watchColumn", e.target.value)}
          placeholder="id"
          aria-describedby={errors?.watchColumn ? "ws-watchColumn-err" : undefined}
          aria-invalid={!!errors?.watchColumn}
        />
        {errors?.watchColumn && (
          <p
            id="ws-watchColumn-err"
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <span aria-hidden="true">&#x26A0;</span>
            {errors.watchColumn}
          </p>
        )}
      </div>

      <SampleOutput />
    </div>
  );
}
