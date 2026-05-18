"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type SheetsLocationPickerProps = {
  spreadsheetId: string;
  tabName: string;
  columnName?: string;
  spreadsheetError?: string;
  tabError?: string;
  columnError?: string;
  columnLabel?: string;
  columnHelp?: string;
  columnPlaceholder?: string;
  ids: {
    spreadsheet: string;
    tab: string;
    column?: string;
  };
  onSpreadsheetChange: (spreadsheetId: string) => void;
  onTabChange: (tabName: string) => void;
  onColumnChange?: (columnName: string) => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="flex items-center gap-1.5 text-xs text-destructive"
    >
      <AlertTriangle className="size-3" aria-hidden="true" />
      {message}
    </p>
  );
}

export function SheetsLocationPicker({
  spreadsheetId,
  tabName,
  columnName = "",
  spreadsheetError,
  tabError,
  columnError,
  columnLabel = "Column",
  columnHelp,
  columnPlaceholder = "Select a column",
  ids,
  onSpreadsheetChange,
  onTabChange,
  onColumnChange,
}: SheetsLocationPickerProps) {
  const {
    data: resources,
  } = api.connections.googleSheetsResources.useQuery(undefined, {
    staleTime: 60_000,
  });
  const {
    data: spreadsheets,
    isLoading: spreadsheetsLoading,
    isError: spreadsheetsLoadError,
    refetch: refetchSpreadsheets,
  } = api.connections.listSpreadsheets.useQuery(undefined, {
    staleTime: 60_000,
  });
  const {
    data: tabs,
    isLoading: tabsLoading,
    isError: tabsError,
    refetch: refetchTabs,
  } = api.connections.listSheetTabs.useQuery(
    { spreadsheetId },
    { enabled: spreadsheetId.length > 0, staleTime: 60_000 },
  );
  const {
    data: columns,
    isLoading: columnsLoading,
    isError: columnsError,
    refetch: refetchColumns,
  } = api.connections.listSheetColumns.useQuery(
    { spreadsheetId, tabName },
    {
      enabled:
        Boolean(onColumnChange) &&
        spreadsheetId.length > 0 &&
        tabName.length > 0,
      staleTime: 60_000,
    },
  );

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={ids.spreadsheet}>
          Spreadsheet
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        {spreadsheetsLoadError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="size-3" aria-hidden="true" />
            Could not load spreadsheets -
            <button
              type="button"
              className="underline hover:text-destructive/80"
              onClick={() => void refetchSpreadsheets()}
            >
              Retry
            </button>
            /
            <a href="/connections" className="underline hover:text-destructive/80">
              Reconnect
            </a>
          </div>
        ) : (
          <Select
            value={spreadsheetId}
            disabled={spreadsheetsLoading}
            onValueChange={(value) => {
              if (value) onSpreadsheetChange(value);
            }}
          >
            <SelectTrigger
              id={ids.spreadsheet}
              className="w-full"
              aria-invalid={!!spreadsheetError}
            >
              <SelectValue
                placeholder={
                  spreadsheetsLoading ? "Loading spreadsheets..." : "Select a spreadsheet"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {!spreadsheetsLoading && (!spreadsheets || spreadsheets.length === 0) ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No spreadsheets found.{" "}
                  <a href="/connections" className="underline hover:text-foreground">
                    Check your connection
                  </a>
                  .
                </div>
              ) : (
                spreadsheets?.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
        {resources?.identifier ? (
          <p className="text-xs text-muted-foreground">{resources.identifier}</p>
        ) : null}
        <FieldError message={spreadsheetError} />
      </div>

      {spreadsheetId ? (
        <div className="space-y-1.5">
          <Label htmlFor={ids.tab}>
            Tab
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          {tabsError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Could not load tabs -
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
              onValueChange={(value) => {
                if (value) onTabChange(value);
              }}
            >
              <SelectTrigger
                id={ids.tab}
                className="w-full"
                aria-invalid={!!tabError}
              >
                <SelectValue placeholder={tabsLoading ? "Loading tabs..." : "Select a tab"} />
              </SelectTrigger>
              <SelectContent>
                {!tabsLoading && (!tabs || tabs.length === 0) ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No tabs found in this spreadsheet.
                  </div>
                ) : (
                  tabs?.map((tab) => (
                    <SelectItem key={tab.sheetId} value={tab.title}>
                      {tab.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          <FieldError message={tabError} />
        </div>
      ) : null}

      {onColumnChange && ids.column && spreadsheetId && tabName ? (
        <div className="space-y-1.5">
          <Label htmlFor={ids.column}>
            {columnLabel}
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          {columnHelp ? (
            <p className="text-xs text-muted-foreground">{columnHelp}</p>
          ) : null}
          {columnsError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Could not load columns -
              <button
                type="button"
                className="underline hover:text-destructive/80"
                onClick={() => void refetchColumns()}
              >
                Retry
              </button>
            </div>
          ) : (
            <Select
              value={columnName}
              disabled={columnsLoading || !columns}
              onValueChange={(value) => {
                if (value) onColumnChange(value);
              }}
            >
              <SelectTrigger
                id={ids.column}
                className="w-full"
                aria-invalid={!!columnError}
              >
                <SelectValue
                  placeholder={columnsLoading ? "Loading columns..." : columnPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                {!columnsLoading && (!columns || columns.length === 0) ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No header row found in this tab.
                  </div>
                ) : (
                  columns?.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          <FieldError message={columnError} />
        </div>
      ) : null}
    </>
  );
}
