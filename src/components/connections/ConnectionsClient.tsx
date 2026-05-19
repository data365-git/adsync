"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ConnectionCard } from "~/components/connections/ConnectionCard";
import { DisconnectedProviderCard } from "~/components/connections/DisconnectedProviderCard";
import { Skeleton } from "~/components/ui/skeleton";

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
      className="border-border bg-card flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="bg-muted/50 flex gap-2 border-t px-4 py-3">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-24 rounded-lg" />
      </div>
    </div>
  );
}

const PROVIDERS: {
  provider: "google" | "facebook" | "bitrix";
  label: string;
}[] = [
  { provider: "google", label: "Google Sheets" },
  { provider: "facebook", label: "Facebook Ads" },
  { provider: "bitrix", label: "Bitrix24" },
];

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

  // Empty-state CTAs share one mutation. Server returns { redirectUrl }; we
  // navigate the window to it so Google/Facebook can prompt for consent.
  const [pendingProvider, setPendingProvider] = useState<
    "google" | "facebook" | "bitrix" | null
  >(null);

  const connectMutation = api.connections.connect.useMutation({
    onSuccess: (data) => {
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setPendingProvider(null);
      }
    },
    onError: () => {
      setPendingProvider(null);
    },
  });

  function handleConnect(provider: "google" | "facebook" | "bitrix") {
    setPendingProvider(provider);
    connectMutation.mutate({ provider });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-foreground text-xl font-semibold">Connections</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your Google Sheets, Facebook Ads, and Bitrix24 integrations.
        </p>
      </div>

      {/* Error state — inline, not full-page, keeps chrome visible */}
      {isError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm"
        >
          <AlertCircle
            className="text-destructive mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-destructive font-medium">
              Could not load connections.
            </p>
            <p className="text-muted-foreground mt-0.5">
              Check your network and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            aria-label="Retry loading connections"
            className="shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Loading connections"
          aria-busy="true"
        >
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* All 3 provider cards — always rendered once data is available */}
      {!isLoading && !isError && (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map(({ provider, label }) => {
            const existing = connections?.find((c) => c.provider === provider);

            if (provider === "bitrix") {
              return (
                <ConnectionCard
                  key={existing ? existing.id : "bitrix-disconnected"}
                  // ConnectionCard internally routes bitrix to BitrixConnectionCard
                  // and handles connect/disconnect mutations via its own hooks.
                  // When no connection exists yet we synthesise a placeholder row
                  // so the card renders in disconnected state with a Connect CTA.
                  connection={
                    existing ?? {
                      id: "",
                      userId: "",
                      provider: "bitrix",
                      status: "disconnected",
                      email: null,
                      expiresAt: null,
                      connectedAt: null,
                      lastVerifiedAt: null,
                    }
                  }
                />
              );
            }

            if (existing) {
              return <ConnectionCard key={existing.id} connection={existing} />;
            }

            return (
              <DisconnectedProviderCard
                key={provider}
                provider={provider}
                label={label}
                onConnect={handleConnect}
                pending={pendingProvider === provider}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
