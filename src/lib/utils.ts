import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { RunStatus } from "~/server/mocks/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.floor(seconds - minutes * 60);
  return `${minutes}m ${String(remSeconds).padStart(2, "0")}s`;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatCron(expr: string): string {
  if (!expr || expr.trim() === "") return "No schedule";
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  const minNum = Number(minute);
  const hourNum = Number(hour);

  if (
    !Number.isNaN(minNum) &&
    !Number.isNaN(hourNum) &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    return `Every day at ${String(hourNum).padStart(2, "0")}:${String(minNum).padStart(2, "0")}`;
  }

  if (
    minute === "0" &&
    /^\*\/(\d+)$/.test(hour) &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    const every = hour.split("/")[1];
    return `Every ${every} hours`;
  }

  if (
    !Number.isNaN(minNum) &&
    !Number.isNaN(hourNum) &&
    dayOfMonth === "*" &&
    month === "*" &&
    /^[0-6]$/.test(dayOfWeek)
  ) {
    const dow = DAYS_OF_WEEK[Number(dayOfWeek)] ?? "";
    return `Every ${dow} at ${String(hourNum).padStart(2, "0")}:${String(minNum).padStart(2, "0")}`;
  }

  return expr;
}

export function getStatusColor(status: RunStatus): string {
  switch (status) {
    case "queued":
      return "bg-status-queued/10 text-status-queued border-status-queued/30";
    case "running":
      return "bg-status-running/10 text-status-running border-status-running/30";
    case "success":
      return "bg-status-success/10 text-status-success border-status-success/30";
    case "failed":
      return "bg-status-failed/10 text-status-failed border-status-failed/30";
  }
}

export function getStatusLabel(status: RunStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "success":
      return "Success";
    case "failed":
      return "Failed";
  }
}
