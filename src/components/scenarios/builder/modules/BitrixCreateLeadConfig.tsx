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

      <div className="space-y-1.5">
        <Label htmlFor="bitrix-lead-source">
          Source
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <Select
          value={sourceId}
          onValueChange={(value) => {
            if (value) onChange({ ...config, sourceId: value });
          }}
        >
          <SelectTrigger
            id="bitrix-lead-source"
            className="w-full"
            aria-invalid={!!errors?.sourceId}
          >
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEB">Website</SelectItem>
            <SelectItem value="CALL">Inbound call</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors?.sourceId ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.sourceId}
          </p>
        ) : null}
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
    </div>
  );
}
