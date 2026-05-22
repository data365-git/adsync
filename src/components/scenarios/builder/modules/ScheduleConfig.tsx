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

const LABEL_CLASS = "text-sm font-medium text-slate-700";
const INPUT_CLASS =
  "h-9 rounded-md border border-slate-300 bg-white focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20";
const SELECT_TRIGGER_CLASS =
  "h-9 rounded-md border-slate-300 bg-white focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20 data-[size=default]:h-9";
const HELPER_CLASS = "text-xs text-slate-500";

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
      <Label htmlFor="sched-frequency" className={LABEL_CLASS}>
        Frequency
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onChange(v);
        }}
      >
        <SelectTrigger
          id="sched-frequency"
          className={cn("w-full", SELECT_TRIGGER_CLASS)}
        >
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
      <Label htmlFor="sched-time" className={LABEL_CLASS}>
        Run at (24h)
      </Label>
      <input
        id="sched-time"
        type="time"
        value={`${pad2(hour)}:${pad2(minute)}`}
        onChange={(e) => {
          const { hour: h, minute: m } = timeToHM(e.target.value);
          onChange(h, m);
        }}
        className={cn(
          INPUT_CLASS,
          "w-full min-w-0 px-3 text-sm",
          "placeholder:text-slate-500 transition-colors outline-none",
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
      <Label className={LABEL_CLASS}>Days of week</Label>
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
                "outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20",
                isSelected
                  ? "bg-primary text-primary-foreground border border-transparent"
                  : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
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
      <Label htmlFor="sched-minute" className={LABEL_CLASS}>
        At minute
      </Label>
      <Input
        id="sched-minute"
        type="number"
        min={0}
        max={59}
        value={minute}
        onChange={handleChange}
        aria-invalid={!!error}
        aria-describedby={error ? "minute-error" : undefined}
        className={cn("w-24", INPUT_CLASS)}
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
      <Label htmlFor="sched-dom" className={LABEL_CLASS}>
        On day of month
      </Label>
      <Input
        id="sched-dom"
        type="number"
        min={1}
        max={31}
        value={value}
        onChange={handleChange}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? "dom-error" : "dom-hint"}
        className={cn("w-24", INPUT_CLASS)}
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
        <p id="dom-hint" className={HELPER_CLASS}>
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
        <Label htmlFor="sched-raw-cron" className={LABEL_CLASS}>
          Cron expression
        </Label>
        <Input
          id="sched-raw-cron"
          type="text"
          value={expression}
          onChange={handleChange}
          placeholder="0 7 * * *"
          className={cn("font-mono", INPUT_CLASS)}
          aria-describedby="raw-cron-preview"
          spellCheck={false}
        />
        <p id="raw-cron-preview" className={HELPER_CLASS}>
          {preview || "Enter a valid 5-field cron expression"}
        </p>
      </div>

      {simplifiableFreq && (
        <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <InfoIcon
            className="mt-0.5 size-4 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <div className="flex-1 space-y-1">
            <p className={HELPER_CLASS}>
              This matches the{" "}
              <span className="font-medium text-slate-900 capitalize">
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
      <Label htmlFor="sched-timezone" className={LABEL_CLASS}>
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
          className={cn("w-full", SELECT_TRIGGER_CLASS)}
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
      className="rounded-md border border-slate-200 bg-slate-50 p-3"
      aria-live="polite"
      aria-label="Schedule preview"
    >
      <p className={HELPER_CLASS}>Schedule preview</p>
      <p className="mt-0.5 font-mono text-sm font-medium">{expr}</p>
      <p className={cn("mt-0.5", HELPER_CLASS)}>
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
      <p className={cn("mt-2", HELPER_CLASS)}>
        Next run preview unavailable: {result.error}
      </p>
    );
  }

  if (result.next.length === 0 || !formatter) {
    return (
      <p className={cn("mt-2", HELPER_CLASS)}>
        No upcoming runs in the next year.
      </p>
    );
  }

  return (
    <div
      className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs"
      aria-live="polite"
      aria-label="Upcoming schedule runs"
    >
      <p className="font-medium text-slate-900">Upcoming runs ({timezone})</p>
      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
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
