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
import { MetricsMultiSelect } from "~/components/ad-accounts/form/MetricsMultiSelect";
import { MOCK_AD_ACCOUNTS } from "~/server/mocks/data";

interface FbCampaignInsightsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function FbCampaignInsightsConfig({
  config,
  onChange,
  errors,
}: FbCampaignInsightsConfigProps) {
  const fbAccountId = typeof config.fbAccountId === "string" ? config.fbAccountId : "";
  const dateWindowDays = typeof config.dateWindowDays === "number" ? config.dateWindowDays : 7;
  const metrics = Array.isArray(config.metrics) ? (config.metrics as string[]) : [];
  const campaignFilter = typeof config.campaignFilter === "string" ? config.campaignFilter : "";

  return (
    <div className="space-y-4">
      {/* Ad account */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-camp-account">
          Ad account
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={fbAccountId}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, fbAccountId: val });
          }}
        >
          <SelectTrigger id="fb-camp-account" className="w-full" aria-invalid={!!errors?.fbAccountId}>
            <SelectValue placeholder="Select ad account" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_AD_ACCOUNTS.map((acc) => (
              <SelectItem key={acc.fbAccountId} value={acc.fbAccountId}>
                {acc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.fbAccountId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.fbAccountId}
          </p>
        )}
      </div>

      {/* Date window */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-camp-datewindow">
          Date window (days)
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="fb-camp-datewindow"
          type="number"
          min={1}
          max={30}
          value={dateWindowDays}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) onChange({ ...config, dateWindowDays: val });
          }}
          aria-required="true"
          aria-invalid={!!errors?.dateWindowDays}
          className="w-28"
        />
        {errors?.dateWindowDays ? (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.dateWindowDays}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">1–30 days of historical data to pull.</p>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-1.5">
        <Label>
          Metrics
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <MetricsMultiSelect
          value={metrics}
          onChange={(m) => onChange({ ...config, metrics: m })}
          error={errors?.metrics}
        />
      </div>

      {/* Campaign filter */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-camp-filter">
          Campaign filter
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="fb-camp-filter"
          type="text"
          placeholder="23845678234, 23845678235"
          value={campaignFilter}
          onChange={(e) => onChange({ ...config, campaignFilter: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated campaign IDs. Leave empty to pull all campaigns.
        </p>
      </div>
    </div>
  );
}
