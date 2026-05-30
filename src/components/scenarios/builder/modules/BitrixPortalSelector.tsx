"use client";

import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

/**
 * Picks which connected Bitrix24 portal a Bitrix action targets. Portals are
 * connected on the Connections page (not inline) — this only selects from the
 * ones already connected. Shared by Create Lead and Create Deal.
 */
export function BitrixPortalSelector({
  value,
  onChange,
  error,
  id = "bitrix-portal",
}: {
  value: string;
  onChange: (portalId: string) => void;
  error?: string;
  id?: string;
}) {
  const { data: portals, isLoading } =
    api.connections.listBitrixPortals.useQuery(undefined, {
      staleTime: 60_000,
    });

  const hasPortals = !!portals && portals.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Destination portal
        <span className="ml-1 text-destructive" aria-hidden="true">*</span>
      </Label>

      {hasPortals ? (
        <Select
          value={value}
          // Map portal id → domain so the closed trigger shows the readable
          // domain (e.g. "acme.bitrix24.com") instead of the raw portal id.
          items={Object.fromEntries(portals.map((p) => [p.id, p.domain]))}
          disabled={isLoading}
          onValueChange={(v) => {
            if (v) onChange(v);
          }}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
            <SelectValue placeholder={isLoading ? "Loading portals…" : "Select a portal"} />
          </SelectTrigger>
          <SelectContent>
            {portals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.domain}
                {p.status !== "CONNECTED" ? " (reconnect needed)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading portals…" : "No portals connected. "}
          {!isLoading ? (
            <a
              href="/connections"
              className="inline-flex items-center gap-1 underline hover:text-foreground"
            >
              Connect one in Connections
              <ExternalLinkIcon className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </p>
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
