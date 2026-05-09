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

type Frequency = "daily" | "every-6h" | "weekly" | "custom";

interface CronBuilderProps {
  cronExpression: string;
  timezone: string;
  onCronChange: (cron: string) => void;
  onTimezoneChange: (tz: string) => void;
  onBlur?: () => void;
}

function parseDailyTime(cron: string): { hour: string; minute: string } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return { hour: "06", minute: "00" };
  const [minute, hour] = parts as [string, string, string, string, string];
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (isNaN(h) || isNaN(m)) return { hour: "06", minute: "00" };
  return {
    hour: String(h).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
  };
}

function parseWeeklyDay(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return "1";
  const dow = parts[4] ?? "*";
  return /^[0-6]$/.test(dow) ? dow : "1";
}

function detectFrequency(cron: string): Frequency {
  if (!cron || cron.trim() === "") return "daily";
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return "custom";
  const [minute, hour, dom, month, dow] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];
  if (dom === "*" && month === "*" && dow === "*") {
    if (!isNaN(parseInt(minute, 10)) && !isNaN(parseInt(hour, 10))) {
      return "daily";
    }
    if (minute === "0" && /^\*\/6$/.test(hour)) return "every-6h";
  }
  if (
    dom === "*" &&
    month === "*" &&
    /^[0-6]$/.test(dow) &&
    !isNaN(parseInt(minute, 10)) &&
    !isNaN(parseInt(hour, 10))
  ) {
    return "weekly";
  }
  return "custom";
}

const DAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export function CronBuilder({
  cronExpression,
  timezone,
  onCronChange,
  onTimezoneChange,
  onBlur,
}: CronBuilderProps) {
  const [frequency, setFrequency] = React.useState<Frequency>(() =>
    detectFrequency(cronExpression),
  );

  const { hour: initHour, minute: initMinute } = parseDailyTime(cronExpression);
  const [hour, setHour] = React.useState(initHour);
  const [minute, setMinute] = React.useState(initMinute);
  const [weekday, setWeekday] = React.useState(() =>
    parseWeeklyDay(cronExpression),
  );
  const [customCron, setCustomCron] = React.useState(
    frequency === "custom" ? cronExpression : "",
  );

  // Rebuild cron from UI state
  function buildCron(
    freq: Frequency,
    h: string,
    m: string,
    wd: string,
    custom: string,
  ): string {
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    const safeH = isNaN(hh) ? 6 : Math.min(23, Math.max(0, hh));
    const safeM = isNaN(mm) ? 0 : Math.min(59, Math.max(0, mm));
    switch (freq) {
      case "daily":
        return `${safeM} ${safeH} * * *`;
      case "every-6h":
        return `0 */6 * * *`;
      case "weekly":
        return `${safeM} ${safeH} * * ${wd}`;
      case "custom":
        return custom;
    }
  }

  function handleFrequencyChange(val: string) {
    const freq = val as Frequency;
    setFrequency(freq);
    if (freq !== "custom") {
      const newCron = buildCron(freq, hour, minute, weekday, customCron);
      onCronChange(newCron);
    }
    onBlur?.();
  }

  function handleHourChange(val: string) {
    setHour(val);
    const newCron = buildCron(frequency, val, minute, weekday, customCron);
    onCronChange(newCron);
  }

  function handleMinuteChange(val: string) {
    setMinute(val);
    const newCron = buildCron(frequency, hour, val, weekday, customCron);
    onCronChange(newCron);
  }

  function handleWeekdayChange(val: string) {
    setWeekday(val);
    const newCron = buildCron(frequency, hour, minute, val, customCron);
    onCronChange(newCron);
  }

  function handleCustomChange(val: string) {
    setCustomCron(val);
    onCronChange(val);
  }

  const humanReadable = React.useMemo(() => {
    const tzLabel =
      COMMON_TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone;
    const base = formatCron(cronExpression);
    if (!cronExpression || cronExpression.trim() === "")
      return "No schedule set";
    return `${base}, ${tzLabel}`;
  }, [cronExpression, timezone]);

  const showTimePicker = frequency === "daily" || frequency === "weekly";

  return (
    <div className="space-y-4">
      {/* Frequency selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cron-frequency">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(val) => {
              if (val !== null) handleFrequencyChange(val);
            }}
          >
            <SelectTrigger id="cron-frequency" className="w-full">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Every day</SelectItem>
              <SelectItem value="every-6h">Every 6 hours</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="custom">Custom cron</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <Label htmlFor="cron-timezone">Timezone</Label>
          <Select
            value={timezone}
            onValueChange={(val) => {
              if (val !== null) {
                onTimezoneChange(val);
                onBlur?.();
              }
            }}
          >
            <SelectTrigger id="cron-timezone" className="w-full">
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
        </div>
      </div>

      {/* Weekly day picker */}
      {frequency === "weekly" && (
        <div className="space-y-1.5">
          <Label htmlFor="cron-weekday">Day of week</Label>
          <Select
            value={weekday}
            onValueChange={(val) => {
              if (val !== null) handleWeekdayChange(val);
            }}
          >
            <SelectTrigger id="cron-weekday" className="w-full sm:w-48">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Time picker — shown for daily and weekly */}
      {showTimePicker && (
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="cron-hour">Hour (0–23)</Label>
            <Input
              id="cron-hour"
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => handleHourChange(e.target.value)}
              onBlur={() => {
                const h = parseInt(hour, 10);
                const safe = isNaN(h) ? 6 : Math.min(23, Math.max(0, h));
                const padded = String(safe).padStart(2, "0");
                setHour(padded);
                onBlur?.();
              }}
              className="w-20"
              aria-label="Hour"
            />
          </div>
          <span className="mb-1.5 text-lg font-bold text-muted-foreground">:</span>
          <div className="space-y-1.5">
            <Label htmlFor="cron-minute">Minute (0–59)</Label>
            <Input
              id="cron-minute"
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={() => {
                const m = parseInt(minute, 10);
                const safe = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
                const padded = String(safe).padStart(2, "0");
                setMinute(padded);
                onBlur?.();
              }}
              className="w-20"
              aria-label="Minute"
            />
          </div>
        </div>
      )}

      {/* Custom cron expression input */}
      {frequency === "custom" && (
        <div className="space-y-1.5">
          <Label htmlFor="cron-custom">
            Custom cron expression
            <span className="ml-1 font-normal text-muted-foreground text-xs">
              (min hour dom month dow)
            </span>
          </Label>
          <Input
            id="cron-custom"
            type="text"
            placeholder="0 6 * * *"
            value={customCron}
            onChange={(e) => handleCustomChange(e.target.value)}
            onBlur={() => onBlur?.()}
            className="font-mono"
          />
        </div>
      )}

      {/* Human-readable preview */}
      <div
        className="rounded-lg border border-border bg-muted/40 px-3 py-2"
        aria-live="polite"
        aria-label="Schedule preview"
      >
        <p className="text-xs text-muted-foreground">Schedule preview</p>
        <p className="mt-0.5 text-sm font-medium">
          {humanReadable}
        </p>
      </div>
    </div>
  );
}
