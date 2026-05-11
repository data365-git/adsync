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

interface BitrixUpdateLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function BitrixUpdateLeadConfig({
  config,
  onChange,
  errors,
}: BitrixUpdateLeadConfigProps) {
  const leadId = typeof config.leadId === "string" ? config.leadId : "";
  const title = typeof config.title === "string" ? config.title : "";
  const statusId = typeof config.statusId === "string" ? config.statusId : "";
  const comments = typeof config.comments === "string" ? config.comments : "";

  return (
    <div className="space-y-4">
      {/* Lead ID */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-lead-id">
          Lead ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The numeric ID of the lead to update
        </p>
        <Input
          id="bitrix-update-lead-id"
          type="text"
          placeholder="lead_001"
          value={leadId}
          onChange={(e) => onChange({ ...config, leadId: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.leadId}
        />
        {errors?.leadId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.leadId}
          </p>
        )}
      </div>

      {/* New title */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-lead-title">New title</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Leave blank to keep existing title
        </p>
        <Input
          id="bitrix-update-lead-title"
          type="text"
          placeholder="Updated lead title"
          value={title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
        />
      </div>

      {/* Status — select with "No change" option */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-lead-status">Status</Label>
        <Select
          value={statusId}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, statusId: val });
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

      {/* Comments */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-update-lead-comments">Comments</Label>
        <textarea
          id="bitrix-update-lead-comments"
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
