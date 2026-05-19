"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCwIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import type { OAuthConnection } from "~/server/mocks/types";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ConnectionStatus } from "~/components/connections/ConnectionStatus";
import { DisconnectDialog } from "~/components/connections/DisconnectDialog";
import { TokenExpiryWarning } from "~/components/connections/TokenExpiryWarning";
import { BitrixConnectionCard } from "~/components/connections/cards";
import { ResourceList } from "~/components/connections/ResourceList";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isExpiringWithin3Days(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= THREE_DAYS_MS;
}

const PROVIDER_LABEL: Record<OAuthConnection["provider"], string> = {
  google: "Google Sheets",
  facebook: "Facebook Ads",
  bitrix: "Bitrix24 CRM",
};

// ─── ConnectedResourcePanel ──────────────────────────────────────────────────
// Fetches the resource list for the connected provider and renders it.
// Isolated so the parent card doesn't need to know which query to call.

interface ConnectedResourcePanelProps {
  provider: "google" | "facebook";
  onReconnect: () => void;
}

function ConnectedResourcePanel({
  provider,
  onReconnect,
}: ConnectedResourcePanelProps) {
  const googleQuery = api.connections.googleSheetsResources.useQuery(
    undefined,
    {
      enabled: provider === "google",
      retry: 1,
    },
  );
  const fbQuery = api.connections.facebookAdAccounts.useQuery(undefined, {
    enabled: provider === "facebook",
    retry: 1,
  });

  const query = provider === "google" ? googleQuery : fbQuery;
  const data = query.data;

  const emptyMessage =
    provider === "google"
      ? "No spreadsheets visible — share at least one with this account."
      : "No ad accounts visible for this user.";

  return (
    <ResourceList
      isLoading={query.isLoading}
      isError={query.isError}
      identifier={data?.identifier ?? null}
      items={data?.items ?? []}
      truncated={data?.truncated ?? false}
      totalCount={(data as { totalCount?: number } | undefined)?.totalCount}
      emptyMessage={emptyMessage}
      onRetry={onReconnect}
    />
  );
}

interface ProviderIconProps {
  provider: OAuthConnection["provider"];
}

function ProviderIcon({ provider }: ProviderIconProps) {
  if (provider === "google") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-8 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    );
  }
  if (provider === "facebook") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-8 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
          fill="#1877F2"
        />
      </svg>
    );
  }
  // Bitrix24 — stylized B24 mark; Phase 3 Agent B may swap with the official asset.
  return (
    <svg
      viewBox="0 0 24 24"
      className="text-brand-bitrix size-8 shrink-0"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 2h10.5a5.5 5.5 0 0 1 3.6 9.65A5.5 5.5 0 0 1 13.5 22H3V2zm3 3v5h4.5a2.5 2.5 0 0 0 0-5H6zm0 8v5h5.5a2.5 2.5 0 0 0 0-5H6z" />
    </svg>
  );
}

interface ConnectionCardProps {
  connection: OAuthConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  // Local optimistic state — null means "use server data"
  const [optimisticStatus, setOptimisticStatus] = useState<
    OAuthConnection["status"] | null
  >(null);
  const [isMounted, setIsMounted] = useState(false);

  const utils = api.useUtils();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const effectiveStatus = optimisticStatus ?? connection.status;
  const showExpiryWarning =
    effectiveStatus === "connected" &&
    isExpiringWithin3Days(connection.expiresAt);

  const providerLabel = PROVIDER_LABEL[connection.provider];

  // --- connect / reconnect ---
  const [isConnecting, setIsConnecting] = useState(false);
  const connectMutation = api.connections.connect.useMutation({
    onSuccess: (data) => {
      // Server returns { redirectUrl } pointing at our /api/oauth/<provider>
      // route, which then bounces to Google/Facebook's consent screen. We must
      // actually navigate the window; the OAuth callback redirects back to
      // /connections and the list refreshes there.
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      // Fallback (mutation returned no redirectUrl): show optimistic state.
      setOptimisticStatus("connected");
      void utils.connections.list.invalidate();
    },
    onError: () => {
      setOptimisticStatus(null);
      toast.error(`Failed to connect ${providerLabel}. Please try again.`);
    },
    onSettled: () => {
      setIsConnecting(false);
    },
  });

  function handleConnect() {
    setIsConnecting(true);
    connectMutation.mutate({ provider: connection.provider });
  }

  // --- disconnect ---
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const disconnectMutation = api.connections.disconnect.useMutation({
    onMutate: () => {
      // Optimistic: immediately show disconnecting state
      setOptimisticStatus("disconnected");
    },
    onSuccess: () => {
      void utils.connections.list.invalidate();
      toast.success(`${providerLabel} disconnected.`);
    },
    onError: () => {
      // Rollback
      setOptimisticStatus(null);
      toast.error(`Failed to disconnect. Please try again.`);
    },
    onSettled: () => {
      setIsDisconnecting(false);
    },
  });

  function handleDisconnect() {
    setIsDisconnecting(true);
    disconnectMutation.mutate({ id: connection.id });
  }

  // --- reconnect / refresh ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshMutation = api.connections.refresh.useMutation({
    onSuccess: () => {
      setOptimisticStatus("connected");
      void utils.connections.list.invalidate();
      toast.success(`${providerLabel} reconnected.`);
    },
    onError: () => {
      setOptimisticStatus(null);
      toast.error(`Failed to reconnect ${providerLabel}. Please try again.`);
    },
    onSettled: () => {
      setIsRefreshing(false);
    },
  });

  function handleReconnect() {
    setIsRefreshing(true);
    refreshMutation.mutate({ id: connection.id });
  }

  // --- verify connection health ---
  const verifyMutation = api.connections.verify.useMutation({
    onSuccess: ({ ok }) => {
      setOptimisticStatus(ok ? "connected" : "expired");
      void utils.connections.list.invalidate();
      if (ok) {
        toast.success("Connection is healthy.");
      } else {
        toast.error("Connection ping failed. Try reconnecting.");
      }
    },
    onError: (error) => {
      toast.error(`Verify failed: ${error.message}`);
    },
  });

  function handleVerify() {
    verifyMutation.mutate({ provider: connection.provider });
  }

  const lastVerifiedLabel = connection.lastVerifiedAt
    ? isMounted
      ? formatDistanceToNow(connection.lastVerifiedAt, { addSuffix: true })
      : format(connection.lastVerifiedAt, "MMM d, yyyy")
    : null;

  const isAnyLoading =
    isConnecting || isDisconnecting || isRefreshing || verifyMutation.isPending;

  // --- Bitrix24 provider routing ---
  // All hooks above run unconditionally (React rules). After hooks, we can
  // safely early-return for a specific provider. Uses lowercase 'bitrix' —
  // the tRPC toFrontendConnection normalizer returns lowercase, NOT 'BITRIX24'.
  if (connection.provider === "bitrix") {
    return (
      <BitrixConnectionCard
        connection={connection}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onVerify={handleVerify}
        isVerifying={verifyMutation.isPending}
        lastVerifiedLabel={lastVerifiedLabel}
      />
    );
  }

  return (
    <article
      aria-label={`${providerLabel} connection`}
      className="flex flex-col"
    >
      <Card className="flex flex-1 flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <ProviderIcon provider={connection.provider} />
            <div className="min-w-0 flex-1">
              <CardTitle>{providerLabel}</CardTitle>
              {connection.email && (
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {connection.email}
                </p>
              )}
            </div>
            {/* Status badge is the first visible signal after the icon */}
            <ConnectionStatus status={effectiveStatus} />
          </div>
        </CardHeader>

        {/* Reserve min-height so card doesn't jump when expiry warning appears/disappears */}
        <CardContent className="flex flex-col justify-between gap-3 pt-4">
          <div className="text-muted-foreground space-y-1 text-xs">
            {connection.connectedAt && (
              <p>
                <span className="text-foreground font-medium">Connected:</span>{" "}
                {format(connection.connectedAt, "MMM d, yyyy")}
              </p>
            )}
            {connection.expiresAt && effectiveStatus !== "disconnected" && (
              <p>
                <span className="text-foreground font-medium">Expires:</span>{" "}
                {format(connection.expiresAt, "MMM d, yyyy, h:mm a")}
              </p>
            )}
            <p>
              <span className="text-foreground font-medium">
                Last verified:
              </span>{" "}
              {lastVerifiedLabel ?? "Never verified"}
            </p>
          </div>

          {/* Resource list — shown only when connected.
              provider is narrowed to "google" | "facebook" here because the
              "bitrix" branch returns early above (React hook rules honoured). */}
          {effectiveStatus === "connected" && (
            <ConnectedResourcePanel
              provider={connection.provider}
              onReconnect={handleReconnect}
            />
          )}

          {/* Amber expiry warning — inside card, below status row */}
          {showExpiryWarning && connection.expiresAt && (
            <TokenExpiryWarning
              expiresAt={connection.expiresAt}
              onReconnect={handleReconnect}
              isReconnecting={isRefreshing}
            />
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {effectiveStatus === "connected" ? (
            <>
              {/* Reconnect always visible — user may want to re-auth with different account */}
              <Button
                size="lg"
                variant="outline"
                onClick={handleReconnect}
                disabled={isAnyLoading}
                aria-label={`Reconnect ${providerLabel} with a different account`}
                className="flex-1"
              >
                {isRefreshing ? (
                  <>
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Reconnecting…
                  </>
                ) : (
                  "Reconnect"
                )}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={handleVerify}
                disabled={isAnyLoading}
                aria-label={`Verify ${providerLabel} connection`}
                className="flex-1"
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
              <DisconnectDialog
                providerName={providerLabel}
                isDisconnecting={isDisconnecting}
                onConfirm={handleDisconnect}
                className="flex-1"
              />
            </>
          ) : (
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={isAnyLoading}
              aria-label={`Connect ${providerLabel}`}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Connecting…
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </article>
  );
}
