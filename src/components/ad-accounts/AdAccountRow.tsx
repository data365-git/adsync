"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TableCell, TableRow } from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { formatCron } from "~/lib/utils";
import type { AdAccount } from "~/server/mocks/types";
import { EnabledToggle } from "./EnabledToggle";
import { LastRunBadge } from "./LastRunBadge";

type Props = {
  account: AdAccount;
};

export function AdAccountRow({ account }: Props) {
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
    <TableRow
      tabIndex={0}
      className="h-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset hover:bg-muted/50"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          window.location.href = `/ad-accounts/${account.id}`;
        }
      }}
    >
      {/* Name */}
      <TableCell className="min-w-[160px] max-w-[240px]">
        <Link
          href={`/ad-accounts/${account.id}`}
          className="font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
          tabIndex={-1}
        >
          {account.label}
        </Link>
      </TableCell>

      {/* FB Account ID */}
      <TableCell className="min-w-[180px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="font-mono text-xs text-muted-foreground truncate block max-w-[180px] text-left">
              {account.fbAccountId}
            </TooltipTrigger>
            <TooltipContent side="top">{account.fbAccountId}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Enabled toggle */}
      <TableCell>
        <EnabledToggle
          id={account.id}
          initialEnabled={account.enabled}
          label={account.label}
        />
      </TableCell>

      {/* Schedule */}
      <TableCell className="min-w-[140px]">
        {schedule === "No schedule" ? (
          <span className="text-xs text-muted-foreground">No schedule</span>
        ) : (
          <span className="text-xs">{schedule}</span>
        )}
      </TableCell>

      {/* Last run */}
      <TableCell className="min-w-[120px]">
        <LastRunBadge
          lastRunAt={account.lastRunAt}
          lastRunStatus={account.lastRunStatus}
          isRunning={isRunning}
        />
      </TableCell>

      {/* Actions */}
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-muted"
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
      </TableCell>
    </TableRow>
  );
}
