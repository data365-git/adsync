export type Frequency =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "advanced";

export interface CronInput {
  frequency: Frequency;
  hour?: number; // 0–23
  minute?: number; // 0–59
  daysOfWeek?: number[]; // 0=Sun … 6=Sat (weekly only)
  dayOfMonth?: number; // 1–31 (monthly only)
  customExpression?: string;
}

export interface ParsedCron {
  frequency: Frequency;
  hour?: number;
  minute?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  raw: string;
}

/** Build a cron expression string from structured input. */
export function buildCron(input: CronInput): string {
  const {
    frequency,
    hour = 0,
    minute = 0,
    daysOfWeek = [],
    dayOfMonth = 1,
    customExpression = "",
  } = input;
  switch (frequency) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly": {
      const days = daysOfWeek.length > 0 ? daysOfWeek.join(",") : "1";
      return `${minute} ${hour} * * ${days}`;
    }
    case "monthly":
      return `${minute} ${hour} ${dayOfMonth} * *`;
    case "advanced":
      return customExpression.trim();
    default:
      return customExpression.trim();
  }
}

/**
 * Parse a cron expression back to a structured object.
 * Returns null if the expression cannot be mapped to one of our 4 named frequencies
 * (the caller should fall back to 'advanced' mode in that case).
 *
 * Scope: only parses the patterns we generate with buildCron.
 * Does NOT attempt to parse arbitrary cron syntax.
 */
export function parseCron(expr: string): ParsedCron | null {
  if (!expr || typeof expr !== "string") return null;
  const raw = expr.trim();
  const parts = raw.split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hr, dom, , dow] = parts;

  const minute = parseInt(min ?? "", 10);
  const hour = parseInt(hr ?? "", 10);
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null;

  // hourly: "N * * * *"
  if (hr === "*" && dom === "*" && dow === "*") {
    return { frequency: "hourly", minute, raw };
  }
  // daily: "N H * * *"
  if (dom === "*" && dow === "*") {
    return { frequency: "daily", hour, minute, raw };
  }
  // weekly: "N H * * D[,D...]"
  if (dom === "*" && dow !== "*" && dow !== undefined) {
    const daysOfWeek = dow
      .split(",")
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    return { frequency: "weekly", hour, minute, daysOfWeek, raw };
  }
  // monthly: "N H D * *"
  if (dom !== "*" && dow === "*") {
    const dayOfMonth = parseInt(dom ?? "", 10);
    if (Number.isNaN(dayOfMonth)) return null;
    return { frequency: "monthly", hour, minute, dayOfMonth, raw };
  }
  // Unrecognised pattern — caller must fall back to advanced
  return null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Return a short human-readable description of a cron expression. */
export function humanizeCronShort(expr: string): string {
  const parsed = parseCron(expr);
  if (!parsed) return "Custom schedule";
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (parsed.frequency) {
    case "hourly":
      return "Every hour";
    case "daily":
      return `Daily at ${pad(parsed.hour ?? 0)}:${pad(parsed.minute ?? 0)}`;
    case "weekly": {
      const days = (parsed.daysOfWeek ?? [1])
        .map((d) => DAY_NAMES[d] ?? "?")
        .join(", ");
      return `Weekly ${days} at ${pad(parsed.hour ?? 0)}:${pad(parsed.minute ?? 0)}`;
    }
    case "monthly":
      return `Monthly on day ${parsed.dayOfMonth ?? 1} at ${pad(parsed.hour ?? 0)}:${pad(parsed.minute ?? 0)}`;
    default:
      return "Custom schedule";
  }
}

/**
 * Compute the next fire time for a cron expression.
 * Returns null if the expression cannot be parsed or the next fire time
 * is more than 31 days away (guard against runaway loops).
 *
 * Implementation: brute-force minute-by-minute scan from `from` up to 31 days.
 * Adequate for our 4 named patterns; custom schedules return null.
 *
 * Note: the `_timezone` parameter is accepted for API compatibility but is
 * not used in Phase 1.6 — all computations are in local time. Phase 2 should
 * swap this for a proper Intl-based implementation.
 */
export function nextFireAt(
  expr: string,
  _timezone: string,
  from: Date = new Date(),
): Date | null {
  const parsed = parseCron(expr);
  if (!parsed || parsed.frequency === "advanced") return null;

  const MAX_ITERATIONS = 60 * 24 * 31; // 31 days in minutes
  const candidate = new Date(from);
  // Round up to the next whole minute
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const m = candidate.getMinutes();
    const h = candidate.getHours();
    const d = candidate.getDate();
    const dow = candidate.getDay();

    let matches = false;
    switch (parsed.frequency) {
      case "hourly":
        matches = m === (parsed.minute ?? 0);
        break;
      case "daily":
        matches = h === (parsed.hour ?? 0) && m === (parsed.minute ?? 0);
        break;
      case "weekly":
        matches =
          (parsed.daysOfWeek ?? [1]).includes(dow) &&
          h === (parsed.hour ?? 0) &&
          m === (parsed.minute ?? 0);
        break;
      case "monthly":
        matches =
          d === (parsed.dayOfMonth ?? 1) &&
          h === (parsed.hour ?? 0) &&
          m === (parsed.minute ?? 0);
        break;
    }
    if (matches) return new Date(candidate);
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
}
