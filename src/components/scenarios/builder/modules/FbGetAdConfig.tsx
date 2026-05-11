"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface FbGetAdConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function FbGetAdConfig({
  config,
  onChange,
  errors,
}: FbGetAdConfigProps) {
  const adId = typeof config.adId === "string" ? config.adId : "";

  return (
    <div className="space-y-4">
      {/* Ad ID */}
      <div className="space-y-1.5">
        <Label htmlFor="fb-get-ad-id">
          Ad ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The numeric Facebook ad ID (e.g. 23001234567890)
        </p>
        <Input
          id="fb-get-ad-id"
          type="text"
          placeholder="23001234567890"
          value={adId}
          onChange={(e) => onChange({ ...config, adId: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.adId}
        />
        {errors?.adId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.adId}
          </p>
        )}
      </div>
    </div>
  );
}
