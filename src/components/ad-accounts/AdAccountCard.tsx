"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Pin,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { GoogleSheetsIcon } from "~/lib/integration-icons";
import { cn, formatCron } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { AdAccount } from "~/server/mocks/types";
import { EnabledToggle } from "./EnabledToggle";
import { healthDot, type HealthDot } from "./health";
export { healthDot };

export type AdAccountCardAccount = AdAccount & {
  isPinned?: boolean;
  lastSyncedAt?: Date | null;
  scenarioCount?: number;
  currency?: string;
  linkedSheetName?: string;
};

type Props = {
  account: AdAccountCardAccount;
  onEdit: (account: AdAccountCardAccount) => void;
  onOpenDetails: (account: AdAccountCardAccount) => void;
};

const healthStyles: Record<HealthDot, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function formatSyncedAt(value: Date | null | undefined) {
  if (!value) return "Never synced";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function AdAccountCard({ account, onEdit, onOpenDetails }: Props) {
  const utils = api.useUtils();
  const syncNowMutation = api.adAccounts.syncNow.useMutation({
    onSuccess(data) {
      toast.success(`Synced "${account.label}"`);
      utils.adAccounts.list.setData(undefined, (prev) =>
        prev?.map((item) =>
          item.id === account.id
            ? { ...item, lastSyncedAt: data.syncedAt }
            : item,
        ),
      );
    },
    onError() {
      toast.error(`Failed to sync "${account.label}".`);
    },
  });
  const pinMutation = api.adAccounts.setPinned.useMutation({
    onSuccess() {
      void utils.adAccounts.list.invalidate();
    },
    onError() {
      toast.error(`Failed to update pin for "${account.label}".`);
    },
  });

  const dot = healthDot(account.lastSyncedAt);
  const schedule = formatCron(account.cronExpression);
  const scenarioCount = account.scenarioCount ?? 0;
  const scenarioLabel =
    scenarioCount === 1
      ? "1 scenario uses this account"
      : `${scenarioCount} scenarios use this account`;
  const isPinned = account.isPinned ?? false;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${account.label}`}
      onClick={() => onOpenDetails(account)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          if (event.key === " ") event.preventDefault();
          onOpenDetails(account);
        }
      }}
      className={cn(
        "relative flex min-h-[260px] cursor-pointer flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none",
        isPinned && "border-l-2 border-l-sky-600",
      )}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="sr-only">
          Health: {dot === "green" ? "fresh" : dot === "amber" ? "stale" : "needs sync"}
        </span>
        <span
          className={cn("size-2.5 rounded-full", healthStyles[dot])}
          aria-hidden
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={pinMutation.isPending}
          aria-label={isPinned ? `Unpin ${account.label}` : `Pin ${account.label}`}
          onClick={(event) => {
            event.stopPropagation();
            pinMutation.mutate({ id: account.id, isPinned: !isPinned });
          }}
          className="size-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-sky-500/40"
        >
          <Pin
            className={cn("size-4", isPinned && "fill-current text-sky-700")}
            aria-hidden
          />
        </Button>
      </div>

      <div className="mr-16 flex min-w-0 flex-col gap-1">
        <h2 className="truncate text-base font-medium text-slate-900">
          {account.label}
        </h2>
        <span className="truncate font-mono text-sm text-slate-500">
          {account.fbAccountId}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 uppercase">
          {account.currency ?? "USD"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-600">
          <GoogleSheetsIcon className="size-3.5 text-green-600" />
          <span className="max-w-[180px] truncate">
            {account.linkedSheetName ?? account.campaignTabName}
          </span>
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Last synced</dt>
          <dd className="text-right text-slate-700">
            {formatSyncedAt(account.lastSyncedAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Schedule</dt>
          <dd className="text-right text-slate-700">{schedule}</dd>
        </div>
      </dl>

      <Link
        href={`/scenarios?adAccountId=${encodeURIComponent(account.id)}`}
        onClick={(event) => event.stopPropagation()}
        className="text-sm text-sky-700 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {scenarioLabel}
      </Link>

      <div
        className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="mr-auto flex items-center gap-2">
          <EnabledToggle
            id={account.id}
            initialEnabled={account.enabled}
            label={account.label}
          />
          <span className="text-sm text-slate-500">
            {account.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncNowMutation.isPending}
          onClick={() => syncNowMutation.mutate({ id: account.id })}
          className="min-h-[44px] rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40"
        >
          {syncNowMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Sync now
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(account)}
          className="min-h-[44px] rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40"
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={
            <a
              href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(account.fbAccountId)}`}
              target="_blank"
              rel="noreferrer"
            />
          }
          className="min-h-[44px] rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open in Facebook
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none aria-expanded:bg-slate-100"
            aria-label={`More actions for ${account.label}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={syncNowMutation.isPending}
              onClick={() => syncNowMutation.mutate({ id: account.id })}
            >
              <RefreshCw className="size-4" aria-hidden />
              Sync now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => toast.error("Delete is not yet implemented.")}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
