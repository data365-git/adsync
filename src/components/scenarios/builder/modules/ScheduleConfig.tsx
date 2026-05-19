"use client";

import * as React from "react";
import { toast } from "sonner";
import { InfoIcon } from "lucide-react";
import { COMMON_TIMEZONES } from "~/lib/constants";
import {
  buildCron,
  parseCron,
  humanizeCronShort,
  type Frequency,
} from "~/lib/cron-builder";
import { computeNextRuns } from "~/lib/cron-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// ─── Prop contract (same shape as Phase 1.5) ──────────────────────────────────

interface ScheduleConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

// ─── Internal state ────────────────────────────────────────────────────────────

interface ScheduleState {
  frequency: Frequency;
  hour: number;
  minute: number;
  daysOfWeek: number[]; // 0 = Sun … 6 = Sat
  dayOfMonth: number;
  customExpression: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function timeToHM(value: string): { hour: number; minute: number } {
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  return {
    hour: Number.isNaN(h) ? 0 : Math.max(0, Math.min(23, h)),
    minute: Number.isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

function initState(cronExpr: string): ScheduleState {
  const defaults: ScheduleState = {
    frequency: "daily",
    hour: 7,
    minute: 0,
    daysOfWeek: [1],
    dayOfMonth: 1,
    customExpression: "",
  };
  if (!cronExpr.trim()) return defaults;
  const parsed = parseCron(cronExpr);
  if (!parsed) {
    return { ...defaults, frequency: "advanced", customExpression: cronExpr };
  }
  return {
    frequency: parsed.frequency,
    hour: parsed.hour ?? 7,
    minute: parsed.minute ?? 0,
    daysOfWeek: parsed.daysOfWeek ?? [1],
    dayOfMonth: parsed.dayOfMonth ?? 1,
    customExpression: parsed.frequency === "advanced" ? cronExpr : "",
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface FrequencySelectProps {
  value: Frequency;
  onChange: (value: Frequency) => void;
}

function FrequencySelect({ value, onChange }: FrequencySelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="sched-frequency">Frequency</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onChange(v);
        }}
      >
        <SelectTrigger id="sched-frequency" className="w-full">
          <SelectValue placeholder="Select frequency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hourly">Hourly</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="advanced">Advanced (cron)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="sched-time">Run at (24h)</Label>
      <input
        id="sched-time"
        type="time"
        value={`${pad2(hour)}:${pad2(minute)}`}
        onChange={(e) => {
          const { hour: h, minute: m } = timeToHM(e.target.value);
          onChange(h, m);
        }}
        className={cn(
          "border-input h-9 w-full min-w-0 rounded-lg border bg-transparent px-3 text-sm",
          "placeholder:text-muted-foreground transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-2",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-calendar-picker-indicator]:hidden",
        )}
        aria-label="Run time in 24-hour format"
      />
    </div>
  );
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface DayOfWeekPillsProps {
  selected: number[];
  onChange: (days: number[]) => void;
}

function DayOfWeekPills({ selected, onChange }: DayOfWeekPillsProps) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      if (selected.length === 1) {
        toast.warning("At least one day must be selected.");
        return;
      }
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Days of week</Label>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Days of week"
      >
        {DOW_LABELS.map((label, idx) => {
          const isSelected = selected.includes(idx);
          return (
            <button
              key={label}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              aria-label={label}
              onClick={() => toggle(idx)}
              onKeyDown={(e) => {
                if (e.key === " ") {
                  e.preventDefault();
                  toggle(idx);
                }
              }}
              className={cn(
                "inline-flex min-h-[36px] min-w-[40px] cursor-pointer items-center justify-center rounded-md px-2.5 text-sm font-medium transition-colors",
                "focus-visible:ring-ring focus-visible:border-ring outline-none focus-visible:ring-2",
                isSelected
                  ? "bg-primary text-primary-foreground border border-transparent"
                  : "border-border text-foreground hover:bg-muted border bg-transparent",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MinutePickerProps {
  minute: number;
  onChange: (minute: number) => void;
}

function MinutePicker({ minute, onChange }: MinutePickerProps) {
  const [error, setError] = React.useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10);
    if (Number.isNaN(v) || v < 0 || v > 59) {
      setError("Minute must be between 0 and 59");
    } else {
      setError(null);
      onChange(v);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="sched-minute">At minute</Label>
      <Input
        id="sched-minute"
        type="number"
        min={0}
        max={59}
        value={minute}
        onChange={handleChange}
        aria-invalid={!!error}
        aria-describedby={error ? "minute-error" : undefined}
        className="w-24"
      />
      {error && (
        <p
          id="minute-error"
          role="alert"
          aria-live="polite"
          className="text-destructive flex items-center gap-1.5 text-xs"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}

interface DayOfMonthInputProps {
  value: number;
  onChange: (day: number) => void;
}

function DayOfMonthInput({ value, onChange }: DayOfMonthInputProps) {
  const isInvalid = value < 1 || value > 31;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v)) onChange(v);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="sched-dom">On day of month</Label>
      <Input
        id="sched-dom"
        type="number"
        min={1}
        max={31}
        value={value}
        onChange={handleChange}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? "dom-error" : "dom-hint"}
        className="w-24"
      />
      {isInvalid ? (
        <p
          id="dom-error"
          role="alert"
          aria-live="polite"
          className="text-destructive flex items-center gap-1.5 text-xs"
        >
          <span aria-hidden="true">&#x26A0;</span>
          Day must be between 1 and 31.
        </p>
      ) : (
        <p id="dom-hint" className="text-muted-foreground text-xs">
          If the month has fewer days, the run is skipped.
        </p>
      )}
    </div>
  );
}

interface RawCronInputProps {
  expression: string;
  onChange: (expr: string) => void;
  onSimplify: (state: ScheduleState) => void;
}

function RawCronInput({ expression, onChange, onSimplify }: RawCronInputProps) {
  const [preview, setPreview] = React.useState(() =>
    humanizeCronShort(expression),
  );
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchedFrequency = React.useMemo(
    () => parseCron(expression),
    [expression],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreview(humanizeCronShort(val));
    }, 200);
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSimplify() {
    if (!matchedFrequency) return;
    const state: ScheduleState = {
      frequency: matchedFrequency.frequency,
      hour: matchedFrequency.hour ?? 7,
      minute: matchedFrequency.minute ?? 0,
      daysOfWeek: matchedFrequency.daysOfWeek ?? [1],
      dayOfMonth: matchedFrequency.dayOfMonth ?? 1,
      customExpression: "",
    };
    onSimplify(state);
  }

  const simplifiableFreq =
    matchedFrequency && matchedFrequency.frequency !== "advanced"
      ? matchedFrequency.frequency
      : null;

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="sched-raw-cron">Cron expression</Label>
        <Input
          id="sched-raw-cron"
          type="text"
          value={expression}
          onChange={handleChange}
          placeholder="0 7 * * *"
          className="font-mono"
          aria-describedby="raw-cron-preview"
          spellCheck={false}
        />
        <p id="raw-cron-preview" className="text-muted-foreground text-xs">
          {preview || "Enter a valid 5-field cron expression"}
        </p>
      </div>

      {simplifiableFreq && (
        <div className="border-border bg-muted/40 flex items-start gap-2 rounded-lg border px-3 py-2">
          <InfoIcon
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 space-y-1">
            <p className="text-muted-foreground text-xs">
              This matches the{" "}
              <span className="text-foreground font-medium capitalize">
                {simplifiableFreq}
              </span>{" "}
              pattern — you can switch to simplified mode.
            </p>
            <Button
              variant="ghost"
              size="xs"
              type="button"
              onClick={handleSimplify}
            >
              Switch to {simplifiableFreq} mode
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  error?: string;
}

function TimezoneSelect({ value, onChange, error }: TimezoneSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="sched-timezone">
        Timezone
        <span className="text-destructive ml-1" aria-hidden="true">
          *
        </span>
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onChange(v);
        }}
      >
        <SelectTrigger
          id="sched-timezone"
          className="w-full"
          aria-invalid={!!error}
        >
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
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-destructive flex items-center gap-1.5 text-xs"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}

interface CronPreviewProps {
  expr: string;
}

function CronPreview({ expr }: CronPreviewProps) {
  if (!expr.trim()) return null;
  return (
    <div
      className="border-border bg-muted/40 rounded-lg border px-3 py-2"
      aria-live="polite"
      aria-label="Schedule preview"
    >
      <p className="text-muted-foreground text-xs">Schedule preview</p>
      <p className="mt-0.5 font-mono text-sm font-medium">{expr}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {humanizeCronShort(expr)}
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface NextRunPreviewProps {
  cron: string;
  timezone: string;
}

function NextRunPreview({ cron, timezone }: NextRunPreviewProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const result = React.useMemo(
    () =>
      mounted ? computeNextRuns(cron, timezone, 3) : { next: [], timezone },
    [cron, mounted, timezone],
  );

  const formatter = React.useMemo(
    () =>
      mounted && !result.error
        ? new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null,
    [mounted, result.error, timezone],
  );

  if (!mounted) return null;

  if (result.error) {
    return (
      <p className="text-muted-foreground mt-2 text-xs">
        Next run preview unavailable: {result.error}
      </p>
    );
  }

  if (result.next.length === 0 || !formatter) {
    return (
      <p className="text-muted-foreground mt-2 text-xs">
        No upcoming runs in the next year.
      </p>
    );
  }

  return (
    <div
      className="border-border bg-muted/20 mt-2 rounded-lg border px-3 py-2 text-xs"
      aria-live="polite"
      aria-label="Upcoming schedule runs"
    >
      <p className="text-foreground font-medium">Upcoming runs ({timezone})</p>
      <ul className="text-muted-foreground mt-1 space-y-0.5">
        {result.next.map((date) => (
          <li key={date.toISOString()}>{formatter.format(date)}</li>
        ))}
      </ul>
    </div>
  );
}

export function ScheduleConfig({
  config,
  onChange,
  errors,
}: ScheduleConfigProps) {
  const initialCron =
    typeof config.cronExpression === "string" ? config.cronExpression : "";
  const initialTimezone =
    typeof config.timezone === "string" ? config.timezone : "UTC";

  const [state, setState] = React.useState<ScheduleState>(() =>
    initState(initialCron),
  );

  // Derive cron expression from current state
  const derivedCron = React.useMemo(() => {
    if (state.frequency === "advanced") return state.customExpression;
    return buildCron({
      frequency: state.frequency,
      hour: state.hour,
      minute: state.minute,
      daysOfWeek: state.daysOfWeek,
      dayOfMonth: state.dayOfMonth,
    });
  }, [state]);

  // Propagate changes upward
  const prevCronRef = React.useRef(derivedCron);
  React.useEffect(() => {
    if (derivedCron !== prevCronRef.current) {
      prevCronRef.current = derivedCron;
      onChange({ ...config, cronExpression: derivedCron });
    }
    // We intentionally omit `config` from deps to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedCron]);

  function update(patch: Partial<ScheduleState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function handleFrequencyChange(freq: Frequency) {
    setState((prev) => {
      const next: ScheduleState = { ...prev, frequency: freq };
      // Clear incompatible sub-fields while preserving compatible ones
      if (freq === "hourly") {
        next.hour = 0; // not used but reset cleanly
      }
      if (freq === "daily" || freq === "monthly") {
        // daysOfWeek not relevant
        next.daysOfWeek = [1];
      }
      if (freq === "weekly") {
        // dayOfMonth not relevant; ensure at least one day
        if (next.daysOfWeek.length === 0) next.daysOfWeek = [1];
      }
      if (freq !== "advanced") {
        next.customExpression = "";
      }
      return next;
    });
  }

  function handleSimplify(newState: ScheduleState) {
    setState(newState);
  }

  return (
    <div className="space-y-4">
      <FrequencySelect
        value={state.frequency}
        onChange={handleFrequencyChange}
      />

      {state.frequency === "hourly" && (
        <MinutePicker
          minute={state.minute}
          onChange={(m) => update({ minute: m })}
        />
      )}

      {state.frequency === "daily" && (
        <TimePicker
          hour={state.hour}
          minute={state.minute}
          onChange={(h, m) => update({ hour: h, minute: m })}
        />
      )}

      {state.frequency === "weekly" && (
        <>
          <DayOfWeekPills
            selected={state.daysOfWeek}
            onChange={(days) => update({ daysOfWeek: days })}
          />
          <TimePicker
            hour={state.hour}
            minute={state.minute}
            onChange={(h, m) => update({ hour: h, minute: m })}
          />
        </>
      )}

      {state.frequency === "monthly" && (
        <>
          <DayOfMonthInput
            value={state.dayOfMonth}
            onChange={(d) => update({ dayOfMonth: d })}
          />
          <TimePicker
            hour={state.hour}
            minute={state.minute}
            onChange={(h, m) => update({ hour: h, minute: m })}
          />
        </>
      )}

      {state.frequency === "advanced" && (
        <RawCronInput
          expression={state.customExpression}
          onChange={(expr) => update({ customExpression: expr })}
          onSimplify={handleSimplify}
        />
      )}

      <TimezoneSelect
        value={initialTimezone}
        onChange={(tz) =>
          onChange({ ...config, cronExpression: derivedCron, timezone: tz })
        }
        error={errors?.timezone}
      />

      <CronPreview expr={derivedCron} />
      <NextRunPreview cron={derivedCron} timezone={initialTimezone} />

      {errors?.cronExpression && (
        <p
          role="alert"
          aria-live="polite"
          className="text-destructive flex items-center gap-1.5 text-xs"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {errors.cronExpression}
        </p>
      )}
    </div>
  );
}
