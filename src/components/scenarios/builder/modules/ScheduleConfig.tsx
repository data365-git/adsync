"use client";

import * as React from "react";
import { COMMON_TIMEZONES } from "~/lib/constants";
import { formatCron } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface ScheduleConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function ScheduleConfig({ config, onChange, errors }: ScheduleConfigProps) {
  const cronExpression = typeof config.cronExpression === "string" ? config.cronExpression : "";
  const timezone = typeof config.timezone === "string" ? config.timezone : "";

  const humanReadable = React.useMemo(() => {
    if (!cronExpression.trim()) return "No schedule set";
    const tzLabel = COMMON_TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;
    const base = formatCron(cronExpression);
    return tzLabel ? `${base}, ${tzLabel}` : base;
  }, [cronExpression, timezone]);

  return (
    <div className="space-y-4">
      {/* Cron expression */}
      <div className="space-y-1.5">
        <Label htmlFor="schedule-cron">
          Cron expression
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="schedule-cron"
          type="text"
          placeholder="0 6 * * *"
          value={cronExpression}
          onChange={(e) => onChange({ ...config, cronExpression: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.cronExpression}
          aria-describedby={errors?.cronExpression ? "cron-error" : "cron-hint"}
          className="font-mono"
        />
        {errors?.cronExpression ? (
          <p id="cron-error" role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.cronExpression}
          </p>
        ) : (
          <p id="cron-hint" className="text-xs text-muted-foreground">
            Standard 5-field cron, e.g. <code className="font-mono">0 6 * * *</code> (daily at 06:00)
          </p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <Label htmlFor="schedule-timezone">
          Timezone
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={timezone}
          onValueChange={(val) => {
            if (val !== null) onChange({ ...config, timezone: val });
          }}
        >
          <SelectTrigger id="schedule-timezone" className="w-full" aria-invalid={!!errors?.timezone}>
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.timezone && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.timezone}
          </p>
        )}
      </div>

      {/* Human-readable preview */}
      {(cronExpression || timezone) && (
        <div
          className="rounded-lg border border-border bg-muted/40 px-3 py-2"
          aria-live="polite"
          aria-label="Schedule preview"
        >
          <p className="text-xs text-muted-foreground">Schedule preview</p>
          <p className="mt-0.5 text-sm font-medium">{humanReadable}</p>
        </div>
      )}
    </div>
  );
}
