import { Zap } from "lucide-react";

/**
 * Informational banner for Quick Setup scenarios.
 */
export function QuickSetupBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <div className="shrink-0 rounded-md bg-white/70 p-2">
        <Zap className="size-4 text-sky-700" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-semibold text-slate-900">
          Quick Setup scenarios
        </p>
        <p className="text-xs text-slate-600">
          Quick Setup scenarios are pre-configured automations. Use the filter below to show or hide them.
        </p>
      </div>
    </div>
  );
}
