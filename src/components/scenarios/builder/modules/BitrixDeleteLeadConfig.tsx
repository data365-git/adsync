"use client";

import * as React from "react";

import { FieldMapper } from "./FieldMapper";
import { BitrixPortalSelector } from "./BitrixPortalSelector";

interface BitrixDeleteLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepOutputColumns?: string[];
  panelVisible?: boolean;
}

export function BitrixDeleteLeadConfig({
  config,
  onChange,
  errors,
  prevStepOutputColumns = [],
  panelVisible,
}: BitrixDeleteLeadConfigProps) {
  const portalId = typeof config.portalId === "string" ? config.portalId : "";
  const leadId = typeof config.leadId === "string" ? config.leadId : "";

  return (
    <div className="space-y-4">
      <BitrixPortalSelector
        value={portalId}
        onChange={(value) => onChange({ ...config, portalId: value })}
        error={errors?.portalId}
        id="bitrix-delete-lead-portal"
      />

      <FieldMapper
        label="Lead ID"
        value={leadId}
        onChange={(value) => onChange({ ...config, leadId: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="4242"
        required
        error={errors?.leadId}
      />

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Deleting a lead in Bitrix24 is permanent and cannot be undone.
      </p>
    </div>
  );
}
