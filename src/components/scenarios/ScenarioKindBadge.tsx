import { Badge } from "~/components/ui/badge";
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
  if (kind === "CUSTOM") {
    return (
      <Badge variant="secondary" role="status">
        Custom
      </Badge>
    );
  }

  return (
    <Badge variant="outline" role="status">
      Quick Setup
    </Badge>
  );
}
