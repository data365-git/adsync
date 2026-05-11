"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface BitrixUpdateDealConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function BitrixUpdateDealConfig({
  config,
  onChange,
  errors,
}: BitrixUpdateDealConfigProps) {
  const dealId = typeof config.dealId === "string" ? config.dealId : "";
  const stageId = typeof config.stageId === "string" ? config.stageId : "";
  const opportunity = typeof config.opportunity === "number" ? config.opportunity : "";
  const comments = typeof config.comments === "string" ? config.comments : "";

  return (
    <div className="space-y-4">
      {/* Deal ID */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-deal-id">
          Deal ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The numeric ID of the deal to update
        </p>
        <Input
          id="bitrix-update-deal-id"
          type="text"
          placeholder="deal_001"
          value={dealId}
          onChange={(e) => onChange({ ...config, dealId: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.dealId}
        />
        {errors?.dealId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.dealId}
          </p>
        )}
      </div>

      {/* New stage */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-deal-stage">New stage</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Stage ID to move the deal to (leave blank for no change)
        </p>
        <Input
          id="bitrix-update-deal-stage"
          type="text"
          placeholder="C1:WON"
          value={stageId}
          onChange={(e) => onChange({ ...config, stageId: e.target.value })}
        />
      </div>

      {/* New amount */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-deal-opportunity">New amount</Label>
        <Input
          id="bitrix-update-deal-opportunity"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={opportunity === "" ? "" : opportunity}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              onChange({ ...config, opportunity: val });
            } else {
              onChange(Object.fromEntries(Object.entries(config).filter(([k]) => k !== "opportunity")));
            }
          }}
          className="w-40"
        />
      </div>

      {/* Comments */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-deal-comments">Comments</Label>
        <textarea
          id="bitrix-update-deal-comments"
          rows={3}
          placeholder="Additional notes…"
          value={comments}
          onChange={(e) => onChange({ ...config, comments: e.target.value })}
          className="w-full min-h-[72px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        />
      </div>
    </div>
  );
}
