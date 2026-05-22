"use client";

import * as React from "react";
import { toast } from "sonner";
import { ClockIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { COMMON_TIMEZONES } from "~/lib/constants";
import type { User } from "~/server/mocks/types";

interface TimezoneSectionProps {
  initialTimezone: User["timezone"];
}

function formatLocalTime(timezone: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

export function TimezoneSection({ initialTimezone }: TimezoneSectionProps) {
  const [timezone, setTimezone] = React.useState(initialTimezone);
  const [currentTime, setCurrentTime] = React.useState<string>(() =>
    formatLocalTime(initialTimezone),
  );

  // Update clock every 60 seconds.
  React.useEffect(() => {
    setCurrentTime(formatLocalTime(timezone));
    const id = setInterval(() => {
      setCurrentTime(formatLocalTime(timezone));
    }, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  const updateTimezone = api.settings.updateTimezone.useMutation({
    onSuccess() {
      toast.success("Timezone saved.");
    },
    onError() {
      // Revert optimistic state on failure.
      setTimezone(initialTimezone);
      toast.error("Failed to save timezone. Please try again.");
    },
  });

  function handleValueChange(value: string | null) {
    if (!value) return;
    setTimezone(value);
    updateTimezone.mutate({ timezone: value });
  }

  return (
    <Card className="rounded-lg border border-slate-200 bg-white py-5 text-slate-950 shadow-none ring-0">
      <CardHeader className="gap-1 px-5">
        <CardTitle className="text-lg font-semibold leading-7 text-slate-900">
          Timezone
        </CardTitle>
        <CardDescription className="text-sm font-normal leading-5 text-slate-500">
          Used when displaying scheduled run times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        <label
          htmlFor="settings-timezone"
          className="block text-xs font-medium uppercase tracking-[0.04em] text-slate-500"
        >
          Timezone
        </label>
        <Select value={timezone} onValueChange={handleValueChange}>
          <SelectTrigger
            id="settings-timezone"
            className="h-9 w-full rounded-md border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20"
          >
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border border-slate-200 bg-white text-slate-900 shadow-md ring-0">
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem
                key={tz.value}
                value={tz.value}
                className="text-slate-700 focus:bg-slate-100 focus:text-slate-900"
              >
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="flex items-center gap-1.5 text-sm leading-5 text-slate-500">
          <ClockIcon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>
            Currently{" "}
            <span className="font-medium tabular-nums text-slate-900">
              {currentTime}
            </span>{" "}
            in {timezone}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
