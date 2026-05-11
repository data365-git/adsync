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

interface FbListAdsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function FbListAdsConfig({
  config,
  onChange,
  errors,
}: FbListAdsConfigProps) {
  const fbAccountId = typeof config.fbAccountId === "string" ? config.fbAccountId : "";
  const campaignId = typeof config.campaignId === "string" ? config.campaignId : "";
  const status = typeof config.status === "string" ? config.status : "";

  return (
    <div className="space-y-4">
      {/* Ad Account ID */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-list-ads-account">
          Ad Account ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Format: act_XXXXXXXXX — find this in Facebook Ads Manager
        </p>
        <Input
          id="fb-list-ads-account"
          type="text"
          placeholder="act_109283746501283"
          value={fbAccountId}
          onChange={(e) => onChange({ ...config, fbAccountId: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.fbAccountId}
        />
        {errors?.fbAccountId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.fbAccountId}
          </p>
        )}
      </div>

      {/* Campaign ID */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-list-ads-campaign">Campaign ID</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Leave blank to return ads from all campaigns
        </p>
        <Input
          id="fb-list-ads-campaign"
          type="text"
          placeholder="23845678234"
          value={campaignId}
          onChange={(e) => onChange({ ...config, campaignId: e.target.value })}
        />
      </div>

      {/* Status filter */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-list-ads-status">Status filter</Label>
        <Select
          value={status}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, status: val });
          }}
        >
          <SelectTrigger id="fb-list-ads-status" className="w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
