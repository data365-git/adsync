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
    <Card>
      <CardHeader>
        <CardTitle>Timezone</CardTitle>
        <CardDescription>
          Used when displaying scheduled run times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={timezone} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Currently{" "}
            <span className="font-medium tabular-nums text-foreground">
              {currentTime}
            </span>{" "}
            in {timezone}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
