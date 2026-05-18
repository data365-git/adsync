"use client";

import * as React from "react";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { FieldMapper } from "./FieldMapper";

interface BitrixUpdateLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepOutputColumns?: string[];
}

export function BitrixUpdateLeadConfig({
  config,
  onChange,
  errors,
  prevStepOutputColumns = [],
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
        placeholder="4242"
        required
        error={errors?.leadId}
      />

      <FieldMapper
        label="New title"
        value={title}
        onChange={(value) => onChange({ ...config, title: value })}
        upstreamColumns={prevStepOutputColumns}
        placeholder="Updated lead title"
      />

      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-lead-status">Status</Label>
        <Select
          value={statusId}
          onValueChange={(value) => {
            if (value !== null) onChange({ ...config, statusId: value });
          }}
        >
          <SelectTrigger id="bitrix-update-lead-status" className="w-full">
            <SelectValue placeholder="No change" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No change</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="IN_PROCESS">In process</SelectItem>
            <SelectItem value="PROCESSED">Processed</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <FieldMapper
        label="Comments"
        value={comments}
        onChange={(value) => onChange({ ...config, comments: value })}
        upstreamColumns={prevStepOutputColumns}
        placeholder="Additional notes..."
        multiline
      />
    </div>
  );
}
