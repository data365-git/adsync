import type { OAuthConnection } from "~/server/mocks/types";

const STATUS_CONFIG = {
  connected: {
    label: "Connected",
    className:
      "inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700",
    dotClassName: "bg-green-500",
  },
  expired: {
    label: "Expired",
    className:
      "inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700",
    dotClassName: "bg-amber-500",
  },
  disconnected: {
    label: "Not connected",
    className:
      "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600",
    dotClassName: "bg-slate-400",
  },
  error: {
    label: "Error",
    className:
      "inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700",
    dotClassName: "bg-red-500",
  },
} as const;

interface ConnectionStatusProps {
  status: OAuthConnection["status"] | "error";
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={config.className}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${config.dotClassName}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
