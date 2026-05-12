"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { formatCron } from "~/lib/utils";
import type { AdAccount } from "~/server/mocks/types";
import { EnabledToggle } from "./EnabledToggle";
import { LastRunBadge } from "./LastRunBadge";

type Props = {
  account: AdAccount;
};

export function AdAccountCard({ account }: Props) {
  const [isRunning, setIsRunning] = useState(false);

  const runNowMutation = api.adAccounts.runNow.useMutation({
    onMutate() {
      setIsRunning(true);
    },
    onSuccess() {
      setIsRunning(false);
      toast.success(`Sync started for "${account.label}"`);
    },
    onError() {
      setIsRunning(false);
      toast.error(
        `Failed to trigger sync for "${account.label}". Please try again.`,
      );
    },
  });

  const schedule = formatCron(account.cronExpression);

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      {/* Header row: name + kebab */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/ad-accounts/${account.id}`}
            className="text-foreground truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {account.label}
          </Link>
          <span className="text-muted-foreground truncate font-mono text-xs">
            {account.fbAccountId}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring aria-expanded:bg-muted inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`Actions for ${account.label}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem
              render={<Link href={`/ad-accounts/${account.id}`} />}
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={runNowMutation.isPending}
              onClick={() => runNowMutation.mutate({ id: account.id })}
            >
              <Play className="size-4" aria-hidden />
              Run now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                toast.error(`Delete is not yet implemented.`);
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Schedule */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground shrink-0">Schedule:</span>
        {schedule === "No schedule" ? (
          <span className="text-muted-foreground italic">No schedule</span>
        ) : (
          <span>{schedule}</span>
        )}
      </div>

      {/* Last run */}
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0 pt-0.5 text-xs">
          Last run:
        </span>
        <LastRunBadge
          lastRunAt={account.lastRunAt}
          lastRunStatus={account.lastRunStatus}
          isRunning={isRunning}
        />
      </div>

      {/* Footer: enabled toggle + run now */}
      <div className="flex items-center justify-between gap-3 border-t pt-1">
        <div className="flex items-center gap-2">
          <EnabledToggle
            id={account.id}
            initialEnabled={account.enabled}
            label={account.label}
          />
          <span className="text-muted-foreground text-xs">
            {account.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={runNowMutation.isPending}
          onClick={() => runNowMutation.mutate({ id: account.id })}
          aria-label={`Run now: ${account.label}`}
          className="min-h-[44px] gap-1.5"
        >
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Play className="size-3.5" aria-hidden />
          )}
          Run now
        </Button>
      </div>
    </div>
  );
}
