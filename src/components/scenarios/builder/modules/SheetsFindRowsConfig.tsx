"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { SheetsLocationPicker } from "./SheetsLocationPicker";

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
      <SheetsLocationPicker
        spreadsheetId={spreadsheetId}
        tabName={tabName}
        columnName={searchColumn}
        spreadsheetError={errors?.spreadsheetId}
        tabError={errors?.tabName}
        columnError={errors?.searchColumn}
        columnLabel="Search column"
        columnHelp="Column header to match against."
        columnPlaceholder="Select a search column"
        ids={{
          spreadsheet: "sheets-find-id",
          tab: "sheets-find-tab",
          column: "sheets-find-column",
        }}
        onSpreadsheetChange={(nextSpreadsheetId) =>
          onChange({
            ...config,
            spreadsheetId: nextSpreadsheetId,
            tabName: "",
            searchColumn: "",
          })
        }
        onTabChange={(nextTabName) =>
          onChange({ ...config, tabName: nextTabName, searchColumn: "" })
        }
        onColumnChange={(nextColumn) =>
          onChange({ ...config, searchColumn: nextColumn })
        }
      />

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
