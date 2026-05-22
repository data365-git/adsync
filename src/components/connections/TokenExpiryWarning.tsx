import { AlertTriangle } from "lucide-react";

interface TokenExpiryWarningProps {
  expiresAt: Date;
  onReconnect: () => void;
  isReconnecting: boolean;
}

function formatTimeRemaining(expiresAt: Date): string {
  const now = Date.now();
  const diff = expiresAt.getTime() - now;
  if (diff <= 0) return "now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export function TokenExpiryWarning({
  expiresAt,
  onReconnect,
  isReconnecting,
}: TokenExpiryWarningProps) {
  const timeRemaining = formatTimeRemaining(expiresAt);

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700"
    >
      <AlertTriangle
        className="mt-0.5 size-3.5 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <span className="font-medium">Expires in {timeRemaining}.</span>{" "}
        <button
          type="button"
          onClick={onReconnect}
          disabled={isReconnecting}
          className="font-medium underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
          aria-label="Reconnect now to prevent expiry"
        >
          {isReconnecting ? "Reconnecting…" : "Reconnect now."}
        </button>
      </div>
    </div>
  );
}
