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
import { api } from "~/trpc/react";

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

  const { data: adAccounts, isLoading: accountsLoading } =
    api.adAccounts.list.useQuery();

  return (
    <div className="space-y-4">
      {/* Ad account */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-camp-account">
          Ad account
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Which Facebook ad account to pull data from. Only accounts you&apos;ve connected appear here.
        </p>
        <Select
          value={fbAccountId}
          disabled={accountsLoading}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, fbAccountId: val });
          }}
        >
          <SelectTrigger id="fb-camp-account" className="w-full" aria-invalid={!!errors?.fbAccountId}>
            <SelectValue placeholder={accountsLoading ? "Loading accounts…" : "Select ad account"} />
          </SelectTrigger>
          <SelectContent>
            {!accountsLoading && (!adAccounts || adAccounts.length === 0) ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No connected ad accounts.{" "}
                <a href="/connections" className="underline hover:text-foreground">
                  Connect one on the Connections page.
                </a>
              </div>
            ) : (
              adAccounts?.map((acc) => (
                <SelectItem key={acc.fbAccountId} value={acc.fbAccountId}>
                  {acc.label}
                </SelectItem>
              ))
            )}
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
        <p className="text-xs text-muted-foreground mb-2">
          How many days back from today this pull should cover. Larger windows give more history but make pulls slower.
        </p>
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
        {errors?.dateWindowDays && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.dateWindowDays}
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-1.5">
        <Label>
          Metrics
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The performance metrics to include in each row. Select all you&apos;ll need — you can filter in Sheets later.
        </p>
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
        <p className="text-xs text-muted-foreground mb-2">
          Optional. Enter a campaign name fragment to narrow results. Leave blank to pull all campaigns.
        </p>
        <Input
          id="fb-camp-filter"
          type="text"
          placeholder="23845678234, 23845678235"
          value={campaignFilter}
          onChange={(e) => onChange({ ...config, campaignFilter: e.target.value })}
        />
      </div>
    </div>
  );
}
