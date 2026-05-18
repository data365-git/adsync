"use client";

import * as React from "react";
import { getModule } from "~/lib/modules";
import { SheetsLocationPicker } from "./SheetsLocationPicker";

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
  const spreadsheetId = field(config, "spreadsheetId");
  const tabName = field(config, "tabName");
  const watchColumn = field(config, "watchColumn");

  return (
    <div className="space-y-4">
      <SheetsLocationPicker
        spreadsheetId={spreadsheetId}
        tabName={tabName}
        columnName={watchColumn}
        spreadsheetError={errors?.spreadsheetId}
        tabError={errors?.tabName}
        columnError={errors?.watchColumn}
        columnLabel="Watch column"
        columnHelp="Column header used to detect new rows. Values should be unique per row."
        columnPlaceholder="Select a watch column"
        ids={{
          spreadsheet: "ws-spreadsheetId",
          tab: "ws-tabName",
          column: "ws-watchColumn",
        }}
        onSpreadsheetChange={(nextSpreadsheetId) =>
          onChange({
            ...config,
            spreadsheetId: nextSpreadsheetId,
            tabName: "",
            watchColumn: "",
          })
        }
        onTabChange={(nextTabName) =>
          onChange({ ...config, tabName: nextTabName, watchColumn: "" })
        }
        onColumnChange={(nextColumn) =>
          onChange({ ...config, watchColumn: nextColumn })
        }
      />

      <SampleOutput />
    </div>
  );
}
