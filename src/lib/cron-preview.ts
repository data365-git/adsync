const FIELD_RANGES: Array<[number, number]> = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface NextRunResult {
  next: Date[];
  timezone: string;
  error?: string;
}

export function parseCronField(
  field: string,
  range: [number, number],
): number[] | null {
  if (field === "*") {
    return rangeValues(range);
  }

  if (field.startsWith("*/")) {
    const step = Number(field.slice(2));
    if (!Number.isInteger(step) || step <= 0) return null;

    const values: number[] = [];
    for (let value = range[0]; value <= range[1]; value += step) {
      values.push(value);
    }
    return values;
  }

  const values: number[] = [];
  for (const part of field.split(",")) {
    if (!part) return null;

    if (part.includes("-")) {
      const bounds = part.split("-");
      if (bounds.length !== 2) return null;

      const low = Number(bounds[0]);
      const high = Number(bounds[1]);
      if (
        !Number.isInteger(low) ||
        !Number.isInteger(high) ||
        low > high ||
        low < range[0] ||
        high > range[1]
      ) {
        return null;
      }

      for (let value = low; value <= high; value += 1) {
        values.push(value);
      }
    } else {
      const value = Number(part);
      if (!Number.isInteger(value) || value < range[0] || value > range[1]) {
        return null;
      }
      values.push(value);
    }
  }

  return [...new Set(values)].sort((left, right) => left - right);
}

export function computeNextRuns(
  cron: string,
  timezone: string,
  count: number,
  from: Date = new Date(),
): NextRunResult {
  const fields = cron.trim().split(/\s+/);
  if (!cron.trim() || fields.length !== 5) {
    return {
      next: [],
      timezone,
      error: "Cron must be 5 space-separated fields.",
    };
  }

  const parsed = fields.map((field, index) =>
    parseCronField(field, FIELD_RANGES[index]!),
  );
  if (parsed.some((field) => field === null)) {
    return { next: [], timezone, error: "Cron syntax error." };
  }

  const parsedFields = parsed as [
    number[],
    number[],
    number[],
    number[],
    number[],
  ];
  const [minutes, hours, daysOfMonth, months, daysOfWeek] = parsedFields;
  const next: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);

  const limit = from.getTime() + 366 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= limit && next.length < count) {
    cursor.setMinutes(cursor.getMinutes() + 1);

    const local = renderInTimezone(cursor, timezone);
    if (!local) {
      return { next: [], timezone, error: "Invalid timezone." };
    }

    if (
      minutes.includes(local.minute) &&
      hours.includes(local.hour) &&
      daysOfMonth.includes(local.dayOfMonth) &&
      months.includes(local.month) &&
      daysOfWeek.includes(local.dayOfWeek)
    ) {
      next.push(new Date(cursor.getTime()));
    }
  }

  return { next, timezone };
}

function rangeValues(range: [number, number]): number[] {
  const values: number[] = [];
  for (let value = range[0]; value <= range[1]; value += 1) {
    values.push(value);
  }
  return values;
}

function renderInTimezone(
  date: Date,
  timezone: string,
): {
  minute: number;
  hour: number;
  dayOfMonth: number;
  month: number;
  dayOfWeek: number;
} | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;

    const weekday = getPart("weekday");
    const dayOfWeek =
      typeof weekday === "string" ? WEEKDAY_INDEX[weekday] : undefined;
    const hour = Number(getPart("hour")) % 24;
    const minute = Number(getPart("minute"));
    const month = Number(getPart("month"));
    const dayOfMonth = Number(getPart("day"));

    if (
      dayOfWeek === undefined ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(month) ||
      !Number.isInteger(dayOfMonth)
    ) {
      return null;
    }

    return { minute, hour, dayOfMonth, month, dayOfWeek };
  } catch {
    return null;
  }
}
