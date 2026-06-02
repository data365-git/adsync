"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { SheetsLocationPicker } from "./SheetsLocationPicker";

interface SheetsGetAllRowsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function SheetsGetAllRowsConfig({
  config,
  onChange,
  errors,
}: SheetsGetAllRowsConfigProps) {
  const spreadsheetId =
    typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const limit =
    typeof config.limit === "number" ? String(config.limit) : "";

  return (
    <div className="space-y-4">
      <SheetsLocationPicker
        spreadsheetId={spreadsheetId}
        tabName={tabName}
        spreadsheetError={errors?.spreadsheetId}
        tabError={errors?.tabName}
        ids={{ spreadsheet: "get-all-rows-id", tab: "get-all-rows-tab" }}
        onSpreadsheetChange={(nextId) =>
          onChange({ ...config, spreadsheetId: nextId, tabName: "" })
        }
        onTabChange={(nextTab) => onChange({ ...config, tabName: nextTab })}
      />

      <div className="space-y-1.5">
        <Label htmlFor="get-all-rows-limit">Row limit (optional)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Leave blank to read all rows. Set a number to cap how many are
          processed (e.g. 100).
        </p>
        <Input
          id="get-all-rows-limit"
          type="number"
          min={1}
          placeholder="All rows"
          value={limit}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...config,
              limit: val === "" ? undefined : Number(val),
            });
          }}
        />
      </div>
    </div>
  );
}
