"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import type { OAuthConnection } from "~/server/mocks/types";
import { api } from "~/trpc/react";
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

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isExpiringWithin3Days(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= THREE_DAYS_MS;
}

const PROVIDER_LABEL: Record<OAuthConnection["provider"], string> = {
  google: "Google Sheets",
  facebook: "Facebook Ads",
};

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
  // Facebook
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

interface ConnectionCardProps {
  connection: OAuthConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  // Local optimistic state — null means "use server data"
  const [optimisticStatus, setOptimisticStatus] = useState<
    OAuthConnection["status"] | null
  >(null);

  const utils = api.useUtils();

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

  const isAnyLoading = isConnecting || isDisconnecting || isRefreshing;

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
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {connection.email}
                </p>
              )}
            </div>
            {/* Status badge is the first visible signal after the icon */}
            <ConnectionStatus status={effectiveStatus} />
          </div>
        </CardHeader>

        {/* Reserve min-height so card doesn't jump when expiry warning appears/disappears */}
        <CardContent className="flex min-h-[5rem] flex-col justify-between gap-3 pt-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            {connection.connectedAt && (
              <p>
                <span className="font-medium text-foreground">Connected:</span>{" "}
                {format(connection.connectedAt, "MMM d, yyyy")}
              </p>
            )}
            {connection.expiresAt && effectiveStatus !== "disconnected" && (
              <p>
                <span className="font-medium text-foreground">Expires:</span>{" "}
                {format(connection.expiresAt, "MMM d, yyyy, h:mm a")}
              </p>
            )}
          </div>

          {/* Amber expiry warning — inside card, below status row */}
          {showExpiryWarning && connection.expiresAt && (
            <TokenExpiryWarning
              expiresAt={connection.expiresAt}
              onReconnect={handleReconnect}
              isReconnecting={isRefreshing}
            />
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          {effectiveStatus === "connected" ? (
            <>
              {/* Reconnect always visible — user may want to re-auth with different account */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleReconnect}
                disabled={isAnyLoading}
                aria-label={`Reconnect ${providerLabel} with a different account`}
                className="min-h-[2.75rem] flex-1"
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
              <DisconnectDialog
                providerName={providerLabel}
                isDisconnecting={isDisconnecting}
                onConfirm={handleDisconnect}
              />
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isAnyLoading}
              aria-label={`Connect ${providerLabel}`}
              className="min-h-[2.75rem] flex-1"
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
