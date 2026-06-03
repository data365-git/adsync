"use client";

import * as React from "react";

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
  const comments = typeof config.comments === "string" ? config.comments : "";
  const portalId = typeof config.portalId === "string" ? config.portalId : "";

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
        placeholder="WEB, CALL, EMAIL, or {{utmsource}}"
        required
        error={errors?.sourceId}
      />

      <FieldMapper
        label="Comments"
        value={comments}
        onChange={(value) => onChange({ ...config, comments: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="Additional notes..."
        multiline
      />
    </div>
  );
}
