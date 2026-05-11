"use client";

import { getIntegrationMeta } from "~/lib/integration-icons";
import { cn } from "~/lib/utils";

interface ManualConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ManualConfig({ config, onChange }: ManualConfigProps) {
  const { Icon, tileBg, iconColor } = getIntegrationMeta("trigger.manual");

  return (
    <div className="space-y-4">
      {/* Brand + title row */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tileBg,
          )}
        >
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <p className="text-sm font-semibold">Manual Trigger</p>
      </div>

      <hr className="border-border" />

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        This scenario runs when you click{" "}
        <strong className="font-medium text-foreground">Run now</strong> in the
        header or from the scenarios list. No schedule is needed.
      </p>

      {/* Status */}
      <p className="text-sm text-green-600 dark:text-green-400">
        Status: ✓ Ready (no configuration required)
      </p>
    </div>
  );
}
