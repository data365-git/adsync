"use client";

import * as React from "react";

import { FieldMapper } from "./FieldMapper";

interface BitrixUpdateLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepOutputColumns?: string[];
  panelVisible?: boolean;
}

export function BitrixUpdateLeadConfig({
  config,
  onChange,
  errors,
  prevStepOutputColumns = [],
  panelVisible,
}: BitrixUpdateLeadConfigProps) {
  const leadId = typeof config.leadId === "string" ? config.leadId : "";
  const title = typeof config.title === "string" ? config.title : "";
  const statusId = typeof config.statusId === "string" ? config.statusId : "";
  const comments = typeof config.comments === "string" ? config.comments : "";

  return (
    <div className="space-y-4">
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

      <FieldMapper
        label="New title"
        value={title}
        onChange={(value) => onChange({ ...config, title: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="Updated lead title"
      />

      <FieldMapper
        label="Status"
        value={statusId}
        onChange={(value) => onChange({ ...config, statusId: value })}
        upstreamColumns={prevStepOutputColumns}
        panelVisible={panelVisible}
        placeholder="NEW, IN_PROCESS, CONVERTED, or {{status}}"
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
