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
import { getModule } from "~/lib/modules";

interface WatchBitrixNewLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

const FILTER_FIELD_OPTIONS = [
  { value: "", label: "Any new lead" },
  { value: "SOURCE_ID", label: "By source" },
  { value: "STATUS_ID", label: "By status" },
] as const;

function strField(config: Record<string, unknown>, key: string): string {
  const v = config[key];
  return typeof v === "string" ? v : "";
}

// ── Sample tab from trigger.watch.bitrix_new_lead.sampleOutput
function SampleOutput() {
  const mod = getModule("trigger.watch.bitrix_new_lead");
  const sample = mod?.sampleOutput[0] ?? {};
  const entries = Object.entries(sample);

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Sample output (first lead)
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

export function WatchBitrixNewLeadConfig({
  config,
  onChange,
  errors,
}: WatchBitrixNewLeadConfigProps) {
  function set(key: string, value: string) {
    onChange({ ...config, [key]: value });
  }

  const filterField = strField(config, "filterField");
  const filterValue = strField(config, "filterValue");

  // filterValue is conditionally required when filterField is non-empty
  const filterValueRequired = filterField !== "";
  const filterValueError =
    filterValueRequired && !filterValue.trim()
      ? "Filter value is required when a filter field is selected"
      : (errors?.filterValue ?? undefined);

  return (
    <div className="space-y-4">
      {/* Polling info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
        Polling interval: every 5 minutes. Real polling is wired in Phase 4.
      </div>

      {/* pipeline (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="wb-pipeline">Pipeline</Label>
        <p className="text-xs text-muted-foreground">
          Filter by pipeline name (leave blank for all)
        </p>
        <Input
          id="wb-pipeline"
          value={strField(config, "pipeline")}
          onChange={(e) => set("pipeline", e.target.value)}
          placeholder="Leave blank for all pipelines"
        />
      </div>

      {/* filterField (optional select) */}
      <div className="space-y-1.5">
        <Label htmlFor="wb-filterField">Filter field</Label>
        <Select
          value={filterField}
          onValueChange={(v) => {
            // When clearing the filter field, also clear filterValue to avoid
            // a stale conditionally-required error.
            onChange({ ...config, filterField: v, filterValue: v === "" ? "" : filterValue });
          }}
        >
          <SelectTrigger id="wb-filterField" aria-label="Filter field">
            <SelectValue placeholder="Any new lead" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* filterValue (optional text; conditionally required when filterField set) */}
      <div className="space-y-1.5">
        <Label htmlFor="wb-filterValue">
          Filter value
          {filterValueRequired && (
            <span aria-hidden="true" className="text-destructive ml-1">*</span>
          )}
        </Label>
        <Input
          id="wb-filterValue"
          value={filterValue}
          onChange={(e) => set("filterValue", e.target.value)}
          placeholder={filterValueRequired ? "Required" : "e.g. WEB or NEW"}
          aria-describedby={filterValueError ? "wb-filterValue-err" : undefined}
          aria-invalid={!!filterValueError}
          aria-required={filterValueRequired}
        />
        {filterValueError && (
          <p
            id="wb-filterValue-err"
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <span aria-hidden="true">&#x26A0;</span>
            {filterValueError}
          </p>
        )}
      </div>

      <SampleOutput />
    </div>
  );
}
