"use client";

import { AlertCircle, RefreshCcw, Settings } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export function SettingsPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold leading-8 text-slate-900">
        {title}
      </h1>
      <p className="text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export function SettingsSkeleton({
  rows = 3,
  label,
}: {
  rows?: number;
  label: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="rounded-lg border border-slate-200 bg-white p-5"
    >
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsError({
  title = "Failed to load settings",
  onRetry,
}: {
  title?: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-start"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-red-700/80">
          Check your connection and try again.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        className="min-h-11 border-slate-300 bg-white text-slate-900"
      >
        <RefreshCcw className="size-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function SettingsEmpty({
  title = "No settings found",
  description = "Sign in again to restore settings for this account.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <Settings className="size-8 text-slate-400" aria-hidden="true" />
      <h2 className="mt-4 text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-none sm:p-5">
      {children}
    </div>
  );
}
