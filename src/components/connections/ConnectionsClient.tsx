"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { OAuthConnection } from "~/server/mocks/types";
import {
  BitrixConnectionCard,
  FacebookConnectionCard,
  GoogleConnectionCard,
} from "~/components/connections/cards";

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "You denied access to Google Sheets. Try again to connect.",
  google_invalid: "Google sent an invalid response. Please try again.",
  google_state_mismatch:
    "OAuth state mismatch (possible session change). Please try again.",
  google_exchange_failed:
    "Failed to complete Google connection. Check server logs for details.",
  facebook_denied: "You denied access to Facebook. Try again to connect.",
  facebook_invalid: "Facebook sent an invalid response. Please try again.",
  facebook_state_mismatch:
    "OAuth state mismatch (possible session change). Please try again.",
  facebook_exchange_failed:
    "Failed to complete Facebook connection. Check server logs for details.",
  bitrix_invalid_code: "Bitrix24 connection failed: invalid authorization code",
  bitrix_upsert_failed:
    "Bitrix24 connection failed: could not save credentials",
};

const SUCCESS_LABELS: Record<string, string> = {
  google: "Google Sheets",
  facebook: "Facebook Ads",
  bitrix: "Bitrix24",
};

function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28 bg-slate-100" />
          <Skeleton className="h-3 w-40 bg-slate-100" />
        </div>
        <Skeleton className="h-5 w-20 rounded-md bg-slate-100" />
      </div>
      <div className="mt-5 flex flex-col gap-4">
        <Skeleton className="h-6 w-full bg-slate-100" />
        <Skeleton className="h-3 w-44 bg-slate-100" />
        <Skeleton className="h-1.5 w-full rounded-full bg-slate-100" />
        <Skeleton className="h-9 w-full bg-slate-100" />
      </div>
      <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
        <Skeleton className="h-9 flex-1 rounded-md bg-slate-100" />
        <Skeleton className="h-9 w-24 rounded-md bg-slate-100" />
        <Skeleton className="size-9 rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

const PROVIDERS: {
  provider: "google" | "facebook" | "bitrix";
}[] = [
  { provider: "google" },
  { provider: "facebook" },
  { provider: "bitrix" },
];

const secondaryButtonClass =
  "h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2";

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

function formatRelative(prefix: string, date: Date | null | undefined) {
  if (!date) return "never";
  return `${prefix} ${formatDistanceToNow(date)} ago`;
}

function BitrixCardController({
  connection,
}: {
  connection: FrontendConnection;
}) {
  const utils = api.useUtils();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testEvents, setTestEvents] = useState<ActivityEvent[]>([]);

  const connectMutation = api.connections.connect.useMutation({
    onSuccess: (data) => {
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      void utils.connections.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to connect Bitrix24. Please try again.");
    },
  });

  const disconnectMutation = api.connections.disconnect.useMutation({
    onSuccess: () => {
      void utils.connections.list.invalidate();
      toast.success("Bitrix24 disconnected.");
    },
    onError: () => {
      toast.error("Failed to disconnect. Please try again.");
    },
    onSettled: () => {
      setIsDisconnecting(false);
    },
  });

  const verifyMutation = api.connections.verify.useMutation({
    onSuccess: ({ ok }) => {
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

  const relativeLabel = connection.lastVerifiedAt
    ? formatRelative("verified", connection.lastVerifiedAt)
    : formatRelative("refreshed", connection.updatedAt ?? connection.connectedAt);

  return (
    <BitrixConnectionCard
      connection={connection}
      onConnect={() => {
        connectMutation.mutate({ provider: "bitrix" });
      }}
      onDisconnect={() => {
        setIsDisconnecting(true);
        disconnectMutation.mutate({ id: connection.id });
      }}
      onVerify={() => verifyMutation.mutate({ provider: "bitrix" })}
      onTest={() => testMutation.mutate({ provider: "bitrix" })}
      isVerifying={verifyMutation.isPending}
      isTesting={testMutation.isPending}
      isDisconnecting={isDisconnecting}
      testEvents={testEvents}
      lastRefreshLabel={relativeLabel}
    />
  );
}

export function ConnectionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  const {
    data: connections,
    isLoading,
    isError,
    refetch,
  } = api.connections.list.useQuery();

  // Surface OAuth callback outcome via toast and clean the URL so the toast
  // doesn't re-fire on every render. Both /api/oauth/google/callback and
  // /api/oauth/facebook/callback redirect back here with ?success=<provider>
  // or ?error=<reason>.
  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");
    if (!error && !success) return;

    if (error) {
      toast.error(
        ERROR_MESSAGES[error] ?? "Connection failed. Please try again.",
      );
    }
    if (success) {
      toast.success(
        `${SUCCESS_LABELS[success] ?? success} connected successfully.`,
      );
      // Refresh the connections list so the newly connected card appears.
      void utils.connections.list.invalidate();
    }
    // Strip the query params from the URL after handling.
    router.replace("/connections");
  }, [searchParams, router, utils]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Connections</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your Google Sheets, Facebook Ads, and Bitrix24 integrations.
        </p>
      </div>

      {/* Error state — inline, not full-page, keeps chrome visible */}
      {isError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium">Could not load connections.</p>
            <p className="mt-0.5 text-red-700">
              Check your network and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            aria-label="Retry loading connections"
            className={`${secondaryButtonClass} shrink-0`}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          aria-label="Loading connections"
          aria-busy="true"
        >
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Provider cards */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {PROVIDERS.map(({ provider }) => {
            const existing = connections?.find((c) => c.provider === provider);

            return (
              provider === "google" ? (
                <GoogleConnectionCard
                  key={existing ? existing.id : "google-disconnected"}
                  connection={
                    existing ?? {
                      id: "",
                      userId: "",
                      provider,
                      status: "disconnected",
                      email: null,
                      scope: null,
                      expiresAt: null,
                      connectedAt: null,
                      issuedAt: null,
                      lastVerifiedAt: null,
                      updatedAt: null,
                    }
                  }
                />
              ) : provider === "facebook" ? (
                <FacebookConnectionCard
                  key={existing ? existing.id : "facebook-disconnected"}
                  connection={
                    existing ?? {
                      id: "",
                      userId: "",
                      provider,
                      status: "disconnected",
                      email: null,
                      scope: null,
                      expiresAt: null,
                      connectedAt: null,
                      issuedAt: null,
                      lastVerifiedAt: null,
                      updatedAt: null,
                    }
                  }
                />
              ) : (
                <BitrixCardController
                  key={existing ? existing.id : "bitrix-disconnected"}
                  connection={
                    existing ?? {
                      id: "",
                      userId: "",
                      provider,
                      status: "disconnected",
                      email: null,
                      scope: null,
                      expiresAt: null,
                      connectedAt: null,
                      issuedAt: null,
                      lastVerifiedAt: null,
                      updatedAt: null,
                    }
                  }
                />
              )
            );
          })}
        </div>
      )}
    </div>
  );
}
