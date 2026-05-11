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

interface BitrixFindLeadsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function BitrixFindLeadsConfig({
  config,
  onChange,
  errors,
}: BitrixFindLeadsConfigProps) {
  const filterField = typeof config.filterField === "string" ? config.filterField : "";
  const filterValue = typeof config.filterValue === "string" ? config.filterValue : "";
  const limit = typeof config.limit === "number" ? config.limit : "";

  // Local validation: limit must be a positive integer <= 50
  const limitNum = typeof limit === "number" ? limit : NaN;
  const limitError =
    errors?.limit ??
    (!isNaN(limitNum) && (limitNum < 1 || limitNum > 50 || !Number.isInteger(limitNum))
      ? "Limit must be a whole number between 1 and 50"
      : undefined);

  return (
    <div className="space-y-4">
      {/* Filter field */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-find-leads-field">
          Filter field
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={filterField}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, filterField: val });
          }}
        >
          <SelectTrigger
            id="bitrix-find-leads-field"
            className="w-full"
            aria-invalid={!!errors?.filterField}
          >
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="PHONE">Phone</SelectItem>
            <SelectItem value="STATUS_ID">Status</SelectItem>
            <SelectItem value="SOURCE_ID">Source</SelectItem>
          </SelectContent>
        </Select>
        {errors?.filterField && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.filterField}
          </p>
        )}
      </div>

      {/* Filter value */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-find-leads-value">
          Filter value
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Value to match against the selected field
        </p>
        <Input
          id="bitrix-find-leads-value"
          type="text"
          placeholder="alice@example.com"
          value={filterValue}
          onChange={(e) => onChange({ ...config, filterValue: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.filterValue}
        />
        {errors?.filterValue && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.filterValue}
          </p>
        )}
      </div>

      {/* Limit */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-find-leads-limit">Limit</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Maximum results to return (default 10, max 50)
        </p>
        <Input
          id="bitrix-find-leads-limit"
          type="number"
          min={1}
          max={50}
          placeholder="10"
          value={limit === "" ? "" : limit}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChange({ ...config, limit: val });
            } else {
              onChange(Object.fromEntries(Object.entries(config).filter(([k]) => k !== "limit")));
            }
          }}
          aria-invalid={!!limitError}
          className="w-28"
        />
        {limitError && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {limitError}
          </p>
        )}
      </div>
    </div>
  );
}
