"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
// Select/Label kept for the Status dropdown below
import { FieldMapper } from "./FieldMapper";
import { BitrixPortalSelector } from "./BitrixPortalSelector";

interface BitrixCreateLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepOutputColumns?: string[];
  panelVisible?: boolean;
}

export function BitrixCreateLeadConfig({
  config,
  onChange,
  errors,
  prevStepOutputColumns = [],
  panelVisible,
}: BitrixCreateLeadConfigProps) {
  const title = typeof config.title === "string" ? config.title : "";
  const name = typeof config.name === "string" ? config.name : "";
  const lastName = typeof config.lastName === "string" ? config.lastName : "";
  const phone = typeof config.phone === "string" ? config.phone : "";
  const email = typeof config.email === "string" ? config.email : "";
  const address = typeof config.address === "string" ? config.address : "";
  const sourceId = typeof config.sourceId === "string" ? config.sourceId : "";
  const statusId = typeof config.statusId === "string" ? config.statusId : "";
  const comments = typeof config.comments === "string" ? config.comments : "";
  const utmSource = typeof config.utmSource === "string" ? config.utmSource : "";
  const utmMedium = typeof config.utmMedium === "string" ? config.utmMedium : "";
  const utmCampaign = typeof config.utmCampaign === "string" ? config.utmCampaign : "";
  const utmContent = typeof config.utmContent === "string" ? config.utmContent : "";
  const utmTerm = typeof config.utmTerm === "string" ? config.utmTerm : "";
  const portalId = typeof config.portalId === "string" ? config.portalId : "";

  const sourcesQ = api.connections.listBitrixLeadSources.useQuery(
    { portalId },
    { enabled: portalId.length > 0, staleTime: 60_000 },
  );
  const statusesQ = api.connections.listBitrixLeadStatuses.useQuery(
    { portalId },
    { enabled: portalId.length > 0, staleTime: 60_000 },
  );

  return (
    <div className="space-y-4">
      <BitrixPortalSelector
        value={portalId}
        onChange={(value) => onChange({ ...config, portalId: value })}
        error={errors?.portalId}
        id="bitrix-lead-portal"
      />

      <FieldMapper
        label="Lead title"
        value={title}
        onChange={(value) => onChange({ ...config, title: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="Website inquiry - Alice"
        required
        error={errors?.title}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldMapper
          label="First name"
          value={name}
          onChange={(value) => onChange({ ...config, name: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="Alice"
          required
          error={errors?.name}
        />
        <FieldMapper
          label="Last name"
          value={lastName}
          onChange={(value) => onChange({ ...config, lastName: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="Smith"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldMapper
          label="Phone"
          value={phone}
          onChange={(value) => onChange({ ...config, phone: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="+1 555 000 0000"
        />
        <FieldMapper
          label="Email"
          value={email}
          onChange={(value) => onChange({ ...config, email: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="alice@example.com"
        />
      </div>

      <FieldMapper
        label="Address"
        value={address}
        onChange={(value) => onChange({ ...config, address: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="123 Main St, Springfield"
      />

      <FieldMapper
        label="Source"
        value={sourceId}
        onChange={(value) => onChange({ ...config, sourceId: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="{{utmsource}} or pick from portal →"
        required
        error={errors?.sourceId}
        portalOptions={sourcesQ.data?.map((s) => ({ label: s.name, value: s.statusId }))}
        portalOptionsHeading="Bitrix24 sources"
      />

      <div className="space-y-1.5">
        <Label htmlFor="bitrix-lead-status">Status</Label>
        <Select
          value={statusId}
          disabled={!portalId || statusesQ.isLoading}
          onValueChange={(v) => onChange({ ...config, statusId: v })}
        >
          <SelectTrigger id="bitrix-lead-status" className="w-full">
            <SelectValue
              placeholder={
                !portalId
                  ? "Pick a portal first"
                  : statusesQ.isLoading
                    ? "Loading…"
                    : "Select status (optional)"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No status</SelectItem>
            {statusesQ.data?.map((s) => (
              <SelectItem key={s.statusId} value={s.statusId}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FieldMapper
        label="Comments"
        value={comments}
        onChange={(value) => onChange({ ...config, comments: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="Additional notes..."
        multiline
      />

      <div className="space-y-3 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">UTM tags</p>
        <FieldMapper
          label="UTM Source"
          value={utmSource}
          onChange={(value) => onChange({ ...config, utmSource: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="{{utmsource}} or ig, facebook..."
        />
        <FieldMapper
          label="UTM Medium"
          value={utmMedium}
          onChange={(value) => onChange({ ...config, utmMedium: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="{{utm_medium}} or paid, organic..."
        />
        <FieldMapper
          label="UTM Campaign"
          value={utmCampaign}
          onChange={(value) => onChange({ ...config, utmCampaign: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="{{campaign_name}}"
        />
        <FieldMapper
          label="UTM Content"
          value={utmContent}
          onChange={(value) => onChange({ ...config, utmContent: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="{{adset_name}}"
        />
        <FieldMapper
          label="UTM Term"
          value={utmTerm}
          onChange={(value) => onChange({ ...config, utmTerm: value })}
          upstreamColumns={prevStepOutputColumns}
          panelVisible={panelVisible}
          placeholder="{{ad_name}}"
        />
      </div>
    </div>
  );
}
