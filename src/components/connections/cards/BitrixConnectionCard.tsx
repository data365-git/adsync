"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  Loader2,
  MoreHorizontal,
  RefreshCwIcon,
  TestTube2,
} from "lucide-react";

import type { OAuthConnection } from "~/server/mocks/types";
import { BitrixIcon } from "~/lib/integration-icons";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ConnectionStatus } from "~/components/connections/ConnectionStatus";
import { DisconnectDialog } from "~/components/connections/DisconnectDialog";
import { api } from "~/trpc/react";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

type FrontendConnection = OAuthConnection & {
  scope?: string | null;
  issuedAt?: Date | null;
  updatedAt?: Date | null;
};

type ActivityEvent = {
  id: string;
  label: string;
  timestamp: Date;
  tone: "neutral" | "success" | "error";
};

export interface BitrixConnectionCardProps {
  connection: FrontendConnection | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onVerify?: () => void;
  onTest?: () => void;
  isVerifying?: boolean;
  isTesting?: boolean;
  isDisconnecting?: boolean;
  testEvents?: ActivityEvent[];
  lastRefreshLabel?: string | null;
}

type BitrixStatus = "connected" | "expired" | "disconnected";

function resolveStatus(connection: FrontendConnection | null): BitrixStatus {
  if (connection === null) return "disconnected";
  return connection.status;
}

function splitScopes(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return scope
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getExpiryProgress(
  connection: FrontendConnection | null,
  nowMs: number | null,
) {
  if (!connection?.expiresAt) return null;
  if (nowMs === null) return null;

  const issuedMs =
    (connection.issuedAt ?? connection.connectedAt)?.getTime() ?? nowMs;
  const expiresMs = connection.expiresAt.getTime();
  const totalMs = Math.max(expiresMs - issuedMs, 1);
  const remainingMs = expiresMs - nowMs;

  return {
    percent: Math.min(Math.max(((nowMs - issuedMs) / totalMs) * 100, 0), 100),
    fillClassName:
      remainingMs <= 0
        ? "bg-red-500"
        : remainingMs <= THREE_DAYS_MS
          ? "bg-amber-500"
          : "bg-sky-600",
    shouldReconnect: remainingMs <= THREE_DAYS_MS,
  };
}

function ScopeChips({ scopes }: { scopes: string[] }) {
  if (scopes.length === 0) {
    return <p className="text-xs text-slate-500">No scopes recorded</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="OAuth scopes">
      {scopes.map((scope) => (
        <span
          key={scope}
          className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
          title={scope}
        >
          {scope}
        </span>
      ))}
    </div>
  );
}

function ActivityLog({
  events,
  open,
  onToggle,
}: {
  events: ActivityEvent[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-9 w-full items-center justify-between rounded-md text-left text-sm font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-expanded={open}
      >
        Recent events
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="mt-2 space-y-2" aria-label="Recent connection events">
          {events.slice(0, 10).map((event) => (
            <li key={event.id} className="flex items-start gap-2 text-xs">
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  event.tone === "success" && "bg-green-500",
                  event.tone === "error" && "bg-red-500",
                  event.tone === "neutral" && "bg-slate-400",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-slate-600">
                {event.label}
              </span>
              <time className="font-mono text-slate-500">
                {formatDistanceToNow(event.timestamp)} ago
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const primaryOutlineButtonClass =
  "h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

const primaryButtonClass =
  "h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

const ghostButtonClass =
  "h-9 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

export function BitrixConnectionCard({
  connection,
  onConnect,
  onDisconnect,
  onVerify,
  onTest,
  isVerifying = false,
  isTesting = false,
  isDisconnecting = false,
  testEvents = [],
  lastRefreshLabel,
}: BitrixConnectionCardProps) {
  const status = resolveStatus(connection);
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const scopes = useMemo(() => splitScopes(connection?.scope), [connection?.scope]);
  const expiry = getExpiryProgress(connection, nowMs);
  const isConnected = status === "connected";
  const isExpired = status === "expired";
  const bitrixHealth = api.connections.bitrixHealth.useQuery(undefined, {
    enabled: isConnected,
  });
  const events = useMemo<ActivityEvent[]>(() => {
    const updatedAt = connection?.updatedAt ?? connection?.connectedAt;
    const base = updatedAt
      ? [
          {
            id: "connection-updated",
            label: "Bitrix24 CRM connection updated",
            timestamp: updatedAt,
            tone: "neutral" as const,
          },
        ]
      : [];
    return [...testEvents, ...base].slice(0, 10);
  }, [connection?.connectedAt, connection?.updatedAt, testEvents]);

  function handleConnect() {
    setIsConnecting(true);
    onConnect();
  }

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  return (
    <article
      aria-label="Bitrix24 connection"
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          <BitrixIcon
            className="text-brand-bitrix size-5"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            Bitrix24 CRM
          </h2>
          {connection?.email && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {connection.email}
            </p>
          )}
        </div>

        <ConnectionStatus status={status} />
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-4">
        <ScopeChips scopes={scopes} />

        <div className="space-y-2">
          <p className="font-mono text-xs text-slate-500">
            {lastRefreshLabel ?? "never"}
          </p>

          {expiry && (
            <div aria-label="Token expiry progress">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn("h-full rounded-full", expiry.fillClassName)}
                  style={{ width: `${expiry.percent}%` }}
                />
              </div>
              {(isExpired || expiry.shouldReconnect) && (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="mt-2 text-xs font-medium text-amber-700 underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                >
                  Reconnect
                </button>
              )}
            </div>
          )}
        </div>

        <ActivityLog
          events={events}
          open={eventsOpen}
          onToggle={() => setEventsOpen((open) => !open)}
        />

        {bitrixHealth.data?.canListLeads === false && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            ⚠️ Webhook lacks crm.lead.list permission. Re-add crm scope to the
            inbound webhook in Bitrix24 to enable read-back.{" "}
            <a
              href="https://www.bitrix24.com/apps/dev.php"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Edit webhook ↗
            </a>
          </div>
        )}

        {bitrixHealth.data?.canListLeads === true &&
          bitrixHealth.data.canListDealCategories === true && (
            <div className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-800">
              ✓ Webhook scopes OK
            </div>
          )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {isConnected || isExpired ? (
          <>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onTest}
              disabled={isConnecting || isTesting || isVerifying || !onTest}
              className={`${primaryOutlineButtonClass} flex-1`}
            >
              <TestTube2 className="size-3.5" aria-hidden="true" />
              {isTesting ? "Testing..." : "Test"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={onVerify}
              disabled={isConnecting || isTesting || isVerifying || !onVerify}
              className={`${ghostButtonClass} flex-1`}
            >
              <RefreshCwIcon
                className={cn("size-3.5", isVerifying && "animate-spin")}
                aria-hidden="true"
              />
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Open Bitrix24 actions"
                    className="rounded-md text-slate-700 hover:bg-slate-100 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
                  />
                }
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDisconnectOpen(true)}>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DisconnectDialog
              providerName="Bitrix24"
              isDisconnecting={isDisconnecting}
              onConfirm={onDisconnect}
              open={disconnectOpen}
              onOpenChange={setDisconnectOpen}
              showTrigger={false}
            />
          </>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={handleConnect}
            disabled={isConnecting}
            className={`${primaryButtonClass} flex-1`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        )}
      </div>
    </article>
  );
}
