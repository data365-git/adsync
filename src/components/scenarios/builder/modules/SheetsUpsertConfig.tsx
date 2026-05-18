"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { api } from "~/trpc/react";
import type { ModuleType } from "~/server/mocks/types";

interface SheetsUpsertConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  /** Accepted for API compatibility with StepCard — not used; columns come from the live Sheets API */
  prevStepModuleType?: ModuleType;
}

export function SheetsUpsertConfig({
  config,
  onChange,
  errors,
  prevStepModuleType: _prevStepModuleType,
}: SheetsUpsertConfigProps) {
  const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
  const tabName = typeof config.tabName === "string" ? config.tabName : "";
  const keyFields = Array.isArray(config.keyFields) ? (config.keyFields as string[]) : [];
  const mappedFields = Array.isArray(config.mappedFields) ? (config.mappedFields as string[]) : [];

  const mappedFieldValues = (
    config.mappedFieldValues !== null &&
    typeof config.mappedFieldValues === "object" &&
    !Array.isArray(config.mappedFieldValues)
      ? config.mappedFieldValues
      : {}
  ) as Record<string, string>;

  const { data: resources } = api.connections.googleSheetsResources.useQuery(undefined, {
    staleTime: 60_000,
  });

  // ── Spreadsheets ──────────────────────────────────────────────
  const {
    data: spreadsheets,
    isLoading: spreadsheetsLoading,
    isError: spreadsheetsError,
    refetch: refetchSpreadsheets,
  } = api.connections.listSpreadsheets.useQuery(undefined, { staleTime: 60_000 });

  // ── Tabs (dependent on spreadsheetId) ─────────────────────────
  const {
    data: tabs,
    isLoading: tabsLoading,
    isError: tabsError,
    refetch: refetchTabs,
  } = api.connections.listSheetTabs.useQuery(
    { spreadsheetId },
    { enabled: spreadsheetId.length > 0, staleTime: 60_000 },
  );

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

  function handleSpreadsheetChange(newId: string) {
    onChange({
      ...config,
      spreadsheetId: newId,
      tabName: "",
      keyFields: [],
      mappedFields: [],
      mappedFieldValues: {},
    });
  }

  function handleTabChange(newTab: string) {
    onChange({ ...config, tabName: newTab, keyFields: [], mappedFields: [], mappedFieldValues: {} });
  }

  function handleKeyFieldToggle(col: string) {
    const next = keyFields.includes(col)
      ? keyFields.filter((f) => f !== col)
      : [...keyFields, col];
    onChange({ ...config, keyFields: next });
  }

  function handleMappedFieldToggle(col: string) {
    const next = mappedFields.includes(col)
      ? mappedFields.filter((f) => f !== col)
      : [...mappedFields, col];
    const nextValues = { ...mappedFieldValues };
    if (!next.includes(col)) delete nextValues[col];
    onChange({ ...config, mappedFields: next, mappedFieldValues: nextValues });
  }

  function handleValueSourceChange(col: string, val: string) {
    onChange({
      ...config,
      mappedFieldValues: { ...mappedFieldValues, [col]: val },
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Spreadsheet picker ─────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="sheets-upsert-spreadsheet">
          Spreadsheet
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        {spreadsheetsError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            Could not load spreadsheets —{" "}
            <button
              type="button"
              className="underline hover:text-destructive/80"
              onClick={() => void refetchSpreadsheets()}
            >
              Retry
            </button>{" "}
            /{" "}
            <a href="/connections" className="underline hover:text-destructive/80">
              Reconnect
            </a>
          </div>
        ) : (
          <Select
            value={spreadsheetId}
            disabled={spreadsheetsLoading}
            onValueChange={(val) => {
              if (val !== null) handleSpreadsheetChange(val);
            }}
          >
            <SelectTrigger
              id="sheets-upsert-spreadsheet"
              className="w-full"
              aria-invalid={!!errors?.spreadsheetId}
            >
              <SelectValue
                placeholder={
                  spreadsheetsLoading ? "Loading spreadsheets…" : "Select a spreadsheet"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {!spreadsheetsLoading && (!spreadsheets || spreadsheets.length === 0) ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No spreadsheets visible from this account — share one with the connected Google
                  account or{" "}
                  <a href="/connections" className="underline hover:text-foreground">
                    click Reconnect
                  </a>
                  .
                </div>
              ) : (
                spreadsheets?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
        {resources?.identifier ? (
          <p className="text-xs text-muted-foreground">{resources.identifier}</p>
        ) : null}
        {errors?.spreadsheetId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.spreadsheetId}
          </p>
        )}
      </div>

      {/* ── Tab picker ────────────────────────────────────────── */}
      {spreadsheetId && (
        <div className="space-y-1.5">
          <Label htmlFor="sheets-upsert-tab">
            Tab
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          {tabsError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <span aria-hidden="true">&#x26A0;</span>
              Could not load tabs —{" "}
              <button
                type="button"
                className="underline hover:text-destructive/80"
                onClick={() => void refetchTabs()}
              >
                Retry
              </button>
            </div>
          ) : (
            <Select
              value={tabName}
              disabled={tabsLoading || !tabs}
              onValueChange={(val) => {
                if (val !== null) handleTabChange(val);
              }}
            >
              <SelectTrigger
                id="sheets-upsert-tab"
                className="w-full"
                aria-invalid={!!errors?.tabName}
              >
                <SelectValue placeholder={tabsLoading ? "Loading tabs…" : "Select a tab"} />
              </SelectTrigger>
              <SelectContent>
                {!tabsLoading && (!tabs || tabs.length === 0) ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No tabs found in this spreadsheet.
                  </div>
                ) : (
                  tabs?.map((t) => (
                    <SelectItem key={t.sheetId} value={t.title}>
                      {t.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {errors?.tabName && (
            <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
              <span aria-hidden="true">&#x26A0;</span>
              {errors.tabName}
            </p>
          )}
        </div>
      )}

      {/* ── Column pickers (key fields + mapped fields) ─────── */}
      {spreadsheetId && tabName && (
        <>
          {/* Key fields */}
          <div className="space-y-1.5">
            <Label>
              Key fields
              <span className="ml-1 text-destructive" aria-hidden="true">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Columns that uniquely identify a row. Existing rows with matching key values will be
              updated; others will be appended.
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
                No header row found. Add column headers to the first row in Sheets and retry.
              </p>
            ) : (
              <div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
                {columns.map((col) => {
                  const checked = keyFields.includes(col);
                  return (
                    <div key={col} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <Checkbox
                        id={`upsert-key-${col}`}
                        checked={checked}
                        onCheckedChange={() => handleKeyFieldToggle(col)}
                      />
                      <label
                        htmlFor={`upsert-key-${col}`}
                        className="cursor-pointer truncate text-sm font-mono"
                        title={col}
                      >
                        {col}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            {errors?.keyFields && (
              <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
                <span aria-hidden="true">&#x26A0;</span>
                {errors.keyFields}
              </p>
            )}
          </div>

          {/* Mapped fields */}
          <div className="space-y-1.5">
            <Label>
              Fields to write
              <span className="ml-1 text-destructive" aria-hidden="true">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Pick which columns to write. Enter a value or a placeholder like{" "}
              <code className="text-xs bg-muted px-1 rounded">{"{{step_1.field}}"}</code> for each.
            </p>
            {!columnsError && !columnsLoading && columns && columns.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-card p-2">
                {columns.map((col) => {
                  const checked = mappedFields.includes(col);
                  return (
                    <div key={col} className="flex items-center gap-2">
                      <Checkbox
                        id={`upsert-mapped-${col}`}
                        checked={checked}
                        onCheckedChange={() => handleMappedFieldToggle(col)}
                      />
                      <label
                        htmlFor={`upsert-mapped-${col}`}
                        className="w-28 shrink-0 cursor-pointer truncate text-sm font-mono"
                        title={col}
                      >
                        {col}
                      </label>
                      {checked && (
                        <Input
                          type="text"
                          placeholder={`{{step_1.${col}}}`}
                          value={mappedFieldValues[col] ?? ""}
                          onChange={(e) => handleValueSourceChange(col, e.target.value)}
                          className="h-7 text-xs"
                          aria-label={`Value source for ${col}`}
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
        </>
      )}
    </div>
  );
}
