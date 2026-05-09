import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { OAuthConnection } from "~/server/mocks/types";

const STATUS_CONFIG = {
  connected: {
    label: "Connected",
    icon: CheckCircle2,
    className:
      "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success",
  },
  expired: {
    label: "Expired",
    icon: AlertTriangle,
    className:
      "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning-foreground",
  },
  disconnected: {
    label: "Disconnected",
    icon: XCircle,
    className:
      "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
  },
} as const;

interface ConnectionStatusProps {
  status: OAuthConnection["status"];
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={config.className}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}
