"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Circle,
  Loader2,
  RefreshCwIcon,
} from "lucide-react";
import { format } from "date-fns";

import type { OAuthConnection } from "~/server/mocks/types";
import { BitrixIcon } from "~/lib/integration-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ResourceList } from "~/components/connections/ResourceList";

export interface BitrixConnectionCardProps {
  connection: OAuthConnection | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onVerify?: () => void;
  isVerifying?: boolean;
  lastVerifiedLabel?: string | null;
}

// Derive status from the connection row, falling back to "disconnected" when
// no connection row exists yet.
type ConnectionStatus = "connected" | "expired" | "disconnected";

function resolveStatus(connection: OAuthConnection | null): ConnectionStatus {
  if (connection === null) return "disconnected";
  return connection.status;
}

interface StatusIconProps {
  status: ConnectionStatus;
}

function StatusIcon({ status }: StatusIconProps) {
  if (status === "connected") {
    return (
      <CheckCircle
        className="text-status-success size-4 shrink-0"
        aria-hidden="true"
      />
    );
  }
  if (status === "expired") {
    return (
      <AlertCircle
        className="text-status-warning size-4 shrink-0"
        aria-hidden="true"
      />
    );
  }
  return (
    <Circle className="text-status-queued size-4 shrink-0" aria-hidden="true" />
  );
}

function statusLabel(status: ConnectionStatus): string {
  if (status === "connected") return "Connected";
  if (status === "expired") return "Expired";
  return "Disconnected";
}

// ─── BitrixResourcePanel ─────────────────────────────────────────────────────
// Fetches Bitrix24 pipelines and renders them inside the card.

interface BitrixResourcePanelProps {
  onReconnect: () => void;
}

function BitrixResourcePanel({ onReconnect }: BitrixResourcePanelProps) {
  const query = api.connections.bitrixPipelines.useQuery(undefined, {
    retry: 1,
  });
  const data = query.data;

  return (
    <ResourceList
      isLoading={query.isLoading}
      isError={query.isError}
      identifier={data?.identifier ?? null}
      items={data?.items ?? []}
      truncated={data?.truncated ?? false}
      totalCount={(data as { totalCount?: number } | undefined)?.totalCount}
      emptyMessage="No CRM pipelines found — check your webhook URL."
      onRetry={onReconnect}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function BitrixConnectionCard({
  connection,
  onConnect,
  onDisconnect,
  onVerify,
  isVerifying = false,
  lastVerifiedLabel,
}: BitrixConnectionCardProps) {
  const status = resolveStatus(connection);

  // isConnecting: tracks the in-flight connect CTA click. We manage it locally
  // because the parent's connectMutation is provider-agnostic and may be shared
  // with other CTAs. The parent's onConnect will navigate the window away, so
  // we never need to reset this; but if the parent errors, the card is still
  // mounted and the user would see the spinner — acceptable for this phase.
  const [isConnecting, setIsConnecting] = useState(false);

  // isDisconnectOpen: controls the confirmation popover open state explicitly
  // so we can close it on Cancel or after Confirm.
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);

  function handleConnect() {
    setIsConnecting(true);
    onConnect();
  }

  function handleConfirmDisconnect() {
    setIsDisconnectOpen(false);
    onDisconnect();
  }

  const isConnected = status === "connected";
  const isExpired = status === "expired";
  const isDisconnected = status === "disconnected";
  const showConnectCta = isDisconnected || isExpired;

  return (
    <article aria-label="Bitrix24 connection" className="flex flex-col">
      <Card className="flex flex-1 flex-col">
        {/* ── Header ── */}
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            {/* Brand tile */}
            <div className="bg-brand-bitrix/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <BitrixIcon className="text-brand-bitrix h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <CardTitle>Bitrix24 CRM</CardTitle>
              {connection?.email && (
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {connection.email}
                </p>
              )}
            </div>

            {/* Status badge — icon + text label so color is never the only signal */}
            <div className="flex items-center gap-1.5">
              <StatusIcon status={status} />
              <span
                className={
                  status === "connected"
                    ? "text-status-success text-xs font-medium"
                    : status === "expired"
                      ? "text-status-warning text-xs font-medium"
                      : "text-muted-foreground text-xs font-medium"
                }
              >
                {statusLabel(status)}
              </span>
            </div>
          </div>
        </CardHeader>

        {/* ── Body ── */}
        <CardContent className="flex min-h-[5rem] flex-col justify-between gap-3 pt-4">
          <div className="text-muted-foreground space-y-1 text-xs">
            <p>
              Automate leads, deals, and smart process items in your Bitrix24
              org.
            </p>

            {isConnected && connection?.connectedAt && (
              <p className="mt-1">
                <span className="text-foreground font-medium">Connected</span>{" "}
                {format(connection.connectedAt, "MMM d, yyyy")}
              </p>
            )}

            {isConnected && (
              <p className="mt-1">
                <span className="text-foreground font-medium">
                  Last verified:
                </span>{" "}
                {lastVerifiedLabel ?? "Never verified"}
              </p>
            )}

            {isExpired && connection?.connectedAt && (
              <p className="text-status-warning mt-1">
                Token expired — please reconnect to resume Bitrix24 syncs.
              </p>
            )}
          </div>

          {/* Pipeline list — shown only when connected */}
          {isConnected && <BitrixResourcePanel onReconnect={onConnect} />}
        </CardContent>

        {/* ── Footer ── */}
        <CardFooter className="flex gap-2">
          {showConnectCta && (
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={isConnecting}
              aria-label={isExpired ? "Reconnect Bitrix24" : "Connect Bitrix24"}
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
              ) : isExpired ? (
                "Reconnect"
              ) : (
                "Connect"
              )}
            </Button>
          )}

          {isConnected && (
            <>
              {/* Reconnect with a different account */}
              <Button
                size="lg"
                variant="outline"
                onClick={handleConnect}
                disabled={isConnecting || isVerifying}
                aria-label="Reconnect Bitrix24 with a different account"
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
                  "Reconnect"
                )}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={onVerify}
                disabled={isConnecting || isVerifying || !onVerify}
                aria-label="Verify Bitrix24 connection"
                className="flex-1"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${isVerifying ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>

              {/* Disconnect confirmation popover */}
              <Popover
                open={isDisconnectOpen}
                onOpenChange={setIsDisconnectOpen}
              >
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="lg"
                      aria-label="Disconnect Bitrix24 connection"
                      className="flex-1"
                    />
                  }
                >
                  Disconnect
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-72"
                  // Close on Escape is handled by the Popover primitive itself.
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-medium">
                        Disconnect Bitrix24?
                      </p>
                      <p className="text-muted-foreground text-xs">
                        This will disconnect Bitrix24. Running scenarios that
                        use Bitrix modules will fail. Continue?
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setIsDisconnectOpen(false)}
                        aria-label="Cancel disconnect"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={handleConfirmDisconnect}
                        aria-label="Confirm disconnect Bitrix24"
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </CardFooter>
      </Card>
    </article>
  );
}
