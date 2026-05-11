"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

interface BitrixCreateDealConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function BitrixCreateDealConfig({
  config,
  onChange,
  errors,
}: BitrixCreateDealConfigProps) {
  const title = typeof config.title === "string" ? config.title : "";
  const categoryId = typeof config.categoryId === "string" ? config.categoryId : "";
  const stageId = typeof config.stageId === "string" ? config.stageId : "";
  const opportunity = typeof config.opportunity === "number" ? config.opportunity : "";
  const currency = typeof config.currency === "string" ? config.currency : "";
  const contactId = typeof config.contactId === "string" ? config.contactId : "";

  return (
    <div className="space-y-4">
      {/* Title — full width */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-deal-title">
          Deal title
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Title for the new deal
        </p>
        <Input
          id="bitrix-deal-title"
          type="text"
          placeholder="Enterprise deal — Acme Corp"
          value={title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.title}
        />
        {errors?.title && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.title}
          </p>
        )}
      </div>

      {/* Pipeline ID + Stage ID in 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-category">
            Pipeline ID
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Bitrix24 pipeline (category) ID — found in CRM settings
          </p>
          <Input
            id="bitrix-deal-category"
            type="text"
            placeholder="1"
            value={categoryId}
            onChange={(e) => onChange({ ...config, categoryId: e.target.value })}
            aria-required="true"
            aria-invalid={!!errors?.categoryId}
          />
          {errors?.categoryId && (
            <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
              <span aria-hidden="true">&#x26A0;</span>
              {errors.categoryId}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-stage">
            Stage ID
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Stage within the pipeline (e.g. &quot;C1:NEW&quot;)
          </p>
          <Input
            id="bitrix-deal-stage"
            type="text"
            placeholder="C1:NEW"
            value={stageId}
            onChange={(e) => onChange({ ...config, stageId: e.target.value })}
            aria-required="true"
            aria-invalid={!!errors?.stageId}
          />
          {errors?.stageId && (
            <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
              <span aria-hidden="true">&#x26A0;</span>
              {errors.stageId}
            </p>
          )}
        </div>
      </div>

      {/* Deal amount + Currency in 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-opportunity">Deal amount</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Monetary value of the deal
          </p>
          <Input
            id="bitrix-deal-opportunity"
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
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-currency">Currency</Label>
          <p className="text-xs text-muted-foreground mb-2">
            ISO 4217 code (e.g. &quot;USD&quot;). Defaults to account currency.
          </p>
          <Input
            id="bitrix-deal-currency"
            type="text"
            placeholder="USD"
            maxLength={3}
            value={currency}
            onChange={(e) => onChange({ ...config, currency: e.target.value })}
          />
        </div>
      </div>

      {/* Contact ID — full width */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-deal-contact">Contact ID</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Optional — link to existing Bitrix24 contact by ID
        </p>
        <Input
          id="bitrix-deal-contact"
          type="text"
          placeholder="contact_001"
          value={contactId}
          onChange={(e) => onChange({ ...config, contactId: e.target.value })}
        />
      </div>
    </div>
  );
}
