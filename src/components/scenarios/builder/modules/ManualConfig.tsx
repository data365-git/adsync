"use client";

import { ZapIcon } from "lucide-react";

interface ManualConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ManualConfig({ config, onChange }: ManualConfigProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <ZapIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>
        This step triggers when you click{" "}
        <strong className="font-medium text-foreground">Run Now</strong>. No
        configuration needed.
      </p>
    </div>
  );
}
