"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
  const href = `/ad-accounts/${account.id}`;
  const openAccount = () => router.push(href);

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={`Open ${account.label}`}
      className="h-[52px] cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset focus-visible:outline-none"
      onClick={openAccount}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.key === " ") {
            e.preventDefault();
          }
          openAccount();
        }
      }}
    >
      {/* Name */}
      <TableCell className="max-w-[240px] min-w-[160px] py-3 pr-4 pl-5">
        <Link
          href={href}
          className="text-sm font-medium text-slate-900 hover:underline focus-visible:underline focus-visible:outline-none"
          tabIndex={-1}
        >
          {account.label}
        </Link>
      </TableCell>

      {/* FB Account ID */}
      <TableCell className="min-w-[180px] px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="block max-w-[180px] truncate text-left font-mono text-sm text-slate-500">
              {account.fbAccountId}
            </TooltipTrigger>
            <TooltipContent side="top">{account.fbAccountId}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Enabled toggle */}
      <TableCell
        className="px-4 py-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <EnabledToggle
          id={account.id}
          initialEnabled={account.enabled}
          label={account.label}
        />
      </TableCell>

      {/* Schedule */}
      <TableCell className="min-w-[140px] px-4 py-3">
        {schedule === "No schedule" ? (
          <span className="text-sm text-slate-500">No schedule</span>
        ) : (
          <span className="text-sm text-slate-700">{schedule}</span>
        )}
      </TableCell>

      {/* Last run */}
      <TableCell className="min-w-[120px] px-4 py-3">
        <LastRunBadge
          lastRunAt={account.lastRunAt}
          lastRunStatus={account.lastRunStatus}
          isRunning={isRunning}
        />
      </TableCell>

      {/* Actions */}
      <TableCell
        className="w-10 px-4 py-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none aria-expanded:bg-slate-100"
            aria-label={`Actions for ${account.label}`}
            onClick={(event) => event.stopPropagation()}
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
