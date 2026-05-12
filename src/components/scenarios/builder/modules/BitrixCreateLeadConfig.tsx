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

interface BitrixCreateLeadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function BitrixCreateLeadConfig({
  config,
  onChange,
  errors,
}: BitrixCreateLeadConfigProps) {
  const title = typeof config.title === "string" ? config.title : "";
  const name = typeof config.name === "string" ? config.name : "";
  const lastName = typeof config.lastName === "string" ? config.lastName : "";
  const phone = typeof config.phone === "string" ? config.phone : "";
  const email = typeof config.email === "string" ? config.email : "";
  const sourceId = typeof config.sourceId === "string" ? config.sourceId : "";
  const comments = typeof config.comments === "string" ? config.comments : "";

  return (
    <div className="space-y-4">
      {/* Title — full width */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-lead-title">
          Lead title
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        </Label>
        <p className="text-muted-foreground mb-2 text-xs">
          Short descriptive title for the lead (e.g. &quot;Website inquiry —
          Alice&quot;)
        </p>
        <Input
          id="bitrix-lead-title"
          type="text"
          placeholder="Website inquiry — Alice"
          value={title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.title}
        />
        {errors?.title && (
          <p
            role="alert"
            aria-live="polite"
            className="text-destructive flex items-center gap-1.5 text-xs"
          >
            <span aria-hidden="true">&#x26A0;</span>
            {errors.title}
          </p>
        )}
      </div>

      {/* First name + Last name in 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-lead-name">
            First name
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          </Label>
          <p className="text-muted-foreground mb-2 text-xs">
            Contact first name
          </p>
          <Input
            id="bitrix-lead-name"
            type="text"
            placeholder="Alice"
            value={name}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            aria-required="true"
            aria-invalid={!!errors?.name}
          />
          {errors?.name && (
            <p
              role="alert"
              aria-live="polite"
              className="text-destructive flex items-center gap-1.5 text-xs"
            >
              <span aria-hidden="true">&#x26A0;</span>
              {errors.name}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-lead-lastname">Last name</Label>
          <p className="text-muted-foreground mb-2 text-xs">
            Contact last name
          </p>
          <Input
            id="bitrix-lead-lastname"
            type="text"
            placeholder="Smith"
            value={lastName}
            onChange={(e) => onChange({ ...config, lastName: e.target.value })}
          />
        </div>
      </div>

      {/* Phone + Email in 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-lead-phone">Phone</Label>
          <p className="text-muted-foreground mb-2 text-xs">
            Phone number in any format
          </p>
          <Input
            id="bitrix-lead-phone"
            type="text"
            placeholder="+1 555 000 0000"
            value={phone}
            onChange={(e) => onChange({ ...config, phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-lead-email">Email</Label>
          <p className="text-muted-foreground mb-2 text-xs">
            Contact email address
          </p>
          <Input
            id="bitrix-lead-email"
            type="text"
            placeholder="alice@example.com"
            value={email}
            onChange={(e) => onChange({ ...config, email: e.target.value })}
          />
        </div>
      </div>

      {/* Source — full width select */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-lead-source">
          Source
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        </Label>
        <Select
          value={sourceId}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, sourceId: val });
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
        {errors?.sourceId && (
          <p
            role="alert"
            aria-live="polite"
            className="text-destructive flex items-center gap-1.5 text-xs"
          >
            <span aria-hidden="true">&#x26A0;</span>
            {errors.sourceId}
          </p>
        )}
      </div>

      {/* Comments — full width textarea */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-lead-comments">Comments</Label>
        <p className="text-muted-foreground mb-2 text-xs">
          Additional notes to attach to the lead
        </p>
        <textarea
          id="bitrix-lead-comments"
          rows={3}
          placeholder="Additional notes…"
          value={comments}
          onChange={(e) => onChange({ ...config, comments: e.target.value })}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring min-h-[72px] w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  );
}
