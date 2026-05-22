import { cn } from "~/lib/utils";
import type { ScenarioKind } from "~/server/mocks/types";

type Props = {
  kind: ScenarioKind;
};

/**
 * Visual weight rule:
 * - CUSTOM → default badge (neutral/primary) — the feature, deserves prominence
 * - QUICK_SETUP → outline badge (muted) — a legacy shortcut, secondary importance
 */
export function ScenarioKindBadge({ kind }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium tracking-[0.04em] uppercase",
        kind === "CUSTOM"
          ? "bg-slate-100 text-slate-700"
          : "bg-sky-50 text-sky-700",
      )}
      role="status"
    >
      {kind === "CUSTOM" ? "Custom" : "Quick Setup"}
    </span>
  );
}
