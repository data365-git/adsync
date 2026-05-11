"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Circle, Loader2 } from "lucide-react";
import { format } from "date-fns";

import type { OAuthConnection } from "~/server/mocks/types";
import { BitrixIcon } from "~/lib/integration-icons";
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

export interface BitrixConnectionCardProps {
  connection: OAuthConnection | null;
  onConnect: () => void;
  onDisconnect: () => void;
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
        className="size-4 shrink-0 text-green-500"
        aria-hidden="true"
      />
    );
  }
  if (status === "expired") {
    return (
      <AlertCircle
        className="size-4 shrink-0 text-amber-500"
        aria-hidden="true"
      />
    );
  }
  return (
    <Circle className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
  );
}

function statusLabel(status: ConnectionStatus): string {
  if (status === "connected") return "Connected";
  if (status === "expired") return "Expired";
  return "Disconnected";
}

export function BitrixConnectionCard({
  connection,
  onConnect,
  onDisconnect,
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bitrix-cyan/10">
              <BitrixIcon className="h-5 w-5 text-bitrix-cyan" />
            </div>

            <div className="min-w-0 flex-1">
              <CardTitle>Bitrix24 CRM</CardTitle>
              {connection?.email && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
                    ? "text-xs font-medium text-green-600 dark:text-green-400"
                    : status === "expired"
                      ? "text-xs font-medium text-amber-600 dark:text-amber-400"
                      : "text-xs font-medium text-muted-foreground"
                }
              >
                {statusLabel(status)}
              </span>
            </div>
          </div>
        </CardHeader>

        {/* ── Body ── */}
        <CardContent className="flex min-h-[5rem] flex-col justify-between gap-3 pt-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Automate leads, deals, and smart process items in your Bitrix24
              org.
            </p>

            {isConnected && connection?.connectedAt && (
              <p className="mt-1">
                <span className="font-medium text-foreground">Connected</span>{" "}
                {format(connection.connectedAt, "MMM d, yyyy")}
              </p>
            )}

            {isExpired && connection?.connectedAt && (
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                Token expired — please reconnect to resume Bitrix24 syncs.
              </p>
            )}
          </div>
        </CardContent>

        {/* ── Footer ── */}
        <CardFooter className="flex flex-wrap gap-2">
          {showConnectCta && (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
              aria-label={
                isExpired ? "Reconnect Bitrix24" : "Connect Bitrix24"
              }
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
                size="sm"
                variant="outline"
                onClick={handleConnect}
                disabled={isConnecting}
                aria-label="Reconnect Bitrix24 with a different account"
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
                  "Reconnect"
                )}
              </Button>

              {/* Disconnect confirmation popover */}
              <Popover open={isDisconnectOpen} onOpenChange={setIsDisconnectOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Disconnect Bitrix24 connection"
                      className="min-h-[2.75rem]"
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
                      <p className="text-sm font-medium text-foreground">
                        Disconnect Bitrix24?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This will disconnect Bitrix24. Running scenarios that
                        use Bitrix modules will fail. Continue?
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsDisconnectOpen(false)}
                        aria-label="Cancel disconnect"
                        className="min-h-[2.75rem]"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleConfirmDisconnect}
                        aria-label="Confirm disconnect Bitrix24"
                        className="min-h-[2.75rem]"
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
