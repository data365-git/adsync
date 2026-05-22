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
import { toast } from "sonner";

import type { OAuthConnection } from "~/server/mocks/types";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  BitrixIcon,
  FacebookIcon,
  GoogleSheetsIcon,
} from "~/lib/integration-icons";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ConnectionStatus } from "~/components/connections/ConnectionStatus";
import { DisconnectDialog } from "~/components/connections/DisconnectDialog";
import { BitrixConnectionCard } from "~/components/connections/cards/BitrixConnectionCard";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

type FrontendConnection = OAuthConnection & {
  scope?: string | null;
  issuedAt?: Date | null;
  updatedAt?: Date | null;
};

type Provider = FrontendConnection["provider"];
type EventTone = "neutral" | "success" | "error";

type ActivityEvent = {
  id: string;
  label: string;
  timestamp: Date;
  tone: EventTone;
};

const PROVIDER_LABEL: Record<Provider, string> = {
  google: "Google Sheets",
  facebook: "Facebook Ads",
  bitrix: "Bitrix24 CRM",
};

const PROVIDER_ICON: Record<Provider, typeof GoogleSheetsIcon> = {
  google: GoogleSheetsIcon,
  facebook: FacebookIcon,
  bitrix: BitrixIcon,
};

const primaryOutlineButtonClass =
  "h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

const primaryButtonClass =
  "h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

const ghostButtonClass =
  "h-9 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

function isExpiringWithin3Days(
  expiresAt: Date | null,
  nowMs: number | null,
): boolean {
  if (!expiresAt) return false;
  if (nowMs === null) return false;
  return expiresAt.getTime() - nowMs <= THREE_DAYS_MS;
}

function splitScopes(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return scope
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRelative(prefix: string, date: Date | null | undefined) {
  if (!date) return "never";
  return `${prefix} ${formatDistanceToNow(date)} ago`;
}

function getExpiryProgress(
  issuedAt: Date | null | undefined,
  expiresAt: Date | null,
  nowMs: number | null,
) {
  if (!expiresAt) return null;
  if (nowMs === null) return null;

  const issuedMs = issuedAt?.getTime() ?? nowMs;
  const expiresMs = expiresAt.getTime();
  const totalMs = Math.max(expiresMs - issuedMs, 1);
  const elapsedMs = nowMs - issuedMs;
  const remainingMs = expiresMs - nowMs;

  return {
    percent: Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100),
    fillClassName:
      remainingMs <= 0
        ? "bg-red-500"
        : remainingMs <= THREE_DAYS_MS
          ? "bg-amber-500"
          : "bg-sky-600",
  };
}

function ProviderLogo({ provider }: { provider: Provider }) {
  const Icon = PROVIDER_ICON[provider];
  const colorClass =
    provider === "google"
      ? "text-sheets-green"
      : provider === "facebook"
        ? "text-[#1877F2]"
        : "text-brand-bitrix";

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
      <Icon className={cn("size-5", colorClass)} aria-hidden="true" />
    </div>
  );
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
  const visibleEvents = events.slice(0, 10);

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
          {visibleEvents.map((event) => (
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

interface ConnectionCardProps {
  connection: FrontendConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<
    FrontendConnection["status"] | null
  >(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [testEvents, setTestEvents] = useState<ActivityEvent[]>([]);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const utils = api.useUtils();
  const providerLabel = PROVIDER_LABEL[connection.provider];
  const effectiveStatus = optimisticStatus ?? connection.status;
  const isConnected = effectiveStatus === "connected";
  const isExpired = effectiveStatus === "expired";
  const scopes = useMemo(() => splitScopes(connection.scope), [connection.scope]);
  const issuedAt = connection.issuedAt ?? connection.connectedAt;
  const expiry = getExpiryProgress(issuedAt, connection.expiresAt, nowMs);
  const showExpiryWarning =
    isExpired ||
    (isConnected && isExpiringWithin3Days(connection.expiresAt, nowMs));

  useEffect(() => {
    setIsMounted(true);
    setNowMs(Date.now());
  }, []);

  const connectMutation = api.connections.connect.useMutation({
    onSuccess: (data) => {
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setOptimisticStatus("connected");
      void utils.connections.list.invalidate();
    },
    onError: () => {
      setOptimisticStatus(null);
      toast.error(`Failed to connect ${providerLabel}. Please try again.`);
    },
    onSettled: () => {
      setIsConnecting(false);
      setIsRefreshing(false);
    },
  });

  const disconnectMutation = api.connections.disconnect.useMutation({
    onMutate: () => {
      setOptimisticStatus("disconnected");
    },
    onSuccess: () => {
      void utils.connections.list.invalidate();
      toast.success(`${providerLabel} disconnected.`);
    },
    onError: () => {
      setOptimisticStatus(null);
      toast.error("Failed to disconnect. Please try again.");
    },
    onSettled: () => {
      setIsDisconnecting(false);
    },
  });

  const verifyMutation = api.connections.verify.useMutation({
    onSuccess: ({ ok }) => {
      setOptimisticStatus(ok ? "connected" : "expired");
      void utils.connections.list.invalidate();
      toast[ok ? "success" : "error"](
        ok ? "Connection is healthy." : "Connection ping failed. Try reconnecting.",
      );
    },
    onError: (error) => {
      toast.error(`Verify failed: ${error.message}`);
    },
  });

  const testMutation = api.connections.test.useMutation({
    onSuccess: (result) => {
      const timestamp = new Date();
      setTestEvents((current) =>
        [
          {
            id: `${timestamp.toISOString()}-${current.length}`,
            label: result.ok
              ? `Test passed in ${result.latencyMs}ms${result.asUser ? ` as ${result.asUser}` : ""}`
              : `Test failed: ${result.message}`,
            timestamp,
            tone: result.ok ? ("success" as const) : ("error" as const),
          },
          ...current,
        ].slice(0, 10),
      );
      toast[result.ok ? "success" : "error"](result.message);
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  function handleConnect() {
    setIsConnecting(true);
    connectMutation.mutate({ provider: connection.provider });
  }

  function handleReconnect() {
    setIsRefreshing(true);
    connectMutation.mutate({ provider: connection.provider });
  }

  function handleDisconnect() {
    setIsDisconnecting(true);
    disconnectMutation.mutate({ id: connection.id });
  }

  function handleVerify() {
    verifyMutation.mutate({ provider: connection.provider });
  }

  function handleTest() {
    testMutation.mutate({ provider: connection.provider });
  }

  const baseEvents = useMemo<ActivityEvent[]>(() => {
    const updatedAt = connection.updatedAt ?? connection.connectedAt;
    return updatedAt
      ? [
          {
            id: "connection-updated",
            label: `${providerLabel} connection updated`,
            timestamp: updatedAt,
            tone: "neutral",
          },
        ]
      : [];
  }, [connection.connectedAt, connection.updatedAt, providerLabel]);

  const events = [...testEvents, ...baseEvents].slice(0, 10);
  const relativeLabel = connection.lastVerifiedAt
    ? formatRelative("verified", connection.lastVerifiedAt)
    : formatRelative("refreshed", connection.updatedAt ?? connection.connectedAt);
  const isAnyLoading =
    isConnecting ||
    isRefreshing ||
    isDisconnecting ||
    verifyMutation.isPending ||
    testMutation.isPending;

  if (connection.provider === "bitrix") {
    return (
      <BitrixConnectionCard
        connection={connection}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onVerify={handleVerify}
        onTest={handleTest}
        isVerifying={verifyMutation.isPending}
        isTesting={testMutation.isPending}
        isDisconnecting={isDisconnecting}
        testEvents={testEvents}
        lastRefreshLabel={isMounted ? relativeLabel : "refreshed"}
      />
    );
  }

  return (
    <article
      aria-label={`${providerLabel} connection`}
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ProviderLogo provider={connection.provider} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            {providerLabel}
          </h2>
          {connection.email && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {connection.email}
            </p>
          )}
        </div>
        <ConnectionStatus status={effectiveStatus} />
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-4">
        <ScopeChips scopes={scopes} />

        <div className="space-y-2">
          <p className="font-mono text-xs text-slate-500">
            {isMounted ? relativeLabel : "refreshed"}
          </p>

          {expiry && (
            <div aria-label="Token expiry progress">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn("h-full rounded-full", expiry.fillClassName)}
                  style={{ width: `${expiry.percent}%` }}
                />
              </div>
              {showExpiryWarning && (
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isAnyLoading}
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
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {isConnected || isExpired ? (
          <>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={handleTest}
              disabled={isAnyLoading}
              className={`${primaryOutlineButtonClass} flex-1`}
            >
              <TestTube2 className="size-3.5" aria-hidden="true" />
              {testMutation.isPending ? "Testing..." : "Test"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={handleVerify}
              disabled={isAnyLoading}
              className={`${ghostButtonClass} flex-1`}
            >
              <RefreshCwIcon
                className={cn(
                  "size-3.5",
                  verifyMutation.isPending && "animate-spin",
                )}
                aria-hidden="true"
              />
              {verifyMutation.isPending ? "Verifying..." : "Verify"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Open ${providerLabel} actions`}
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
              providerName={providerLabel}
              isDisconnecting={isDisconnecting}
              onConfirm={handleDisconnect}
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
            disabled={isAnyLoading}
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
