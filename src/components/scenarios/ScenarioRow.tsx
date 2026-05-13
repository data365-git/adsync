"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TableCell, TableRow } from "~/components/ui/table";
import { api } from "~/trpc/react";
import type { Scenario } from "~/server/mocks/types";
import { ScenarioKindBadge } from "./ScenarioKindBadge";
import { ScenarioEnabledToggle } from "./ScenarioEnabledToggle";
import { LastRunCell } from "./LastRunCell";

type Props = {
  scenario: Scenario;
  runCount?: number;
  onDuplicated: (newScenario: Scenario) => void;
  onDeleted: (id: string) => void;
};

export function ScenarioRow({
  scenario,
  runCount,
  onDuplicated,
  onDeleted,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const runNowMutation = api.scenarios.runNow.useMutation({
    onMutate() {
      setIsRunning(true);
    },
    onSuccess() {
      setIsRunning(false);
      toast.success(`Run started for "${scenario.name}"`);
    },
    onError() {
      setIsRunning(false);
      toast.error(
        `Failed to trigger run for "${scenario.name}". Please try again.`,
      );
    },
  });

  const duplicateMutation = api.scenarios.duplicate.useMutation({
    onSuccess(newScenario) {
      onDuplicated(newScenario);
      toast.success(`"${scenario.name}" duplicated`);
    },
    onError() {
      toast.error(`Failed to duplicate "${scenario.name}". Please try again.`);
    },
  });

  const deleteMutation = api.scenarios.delete.useMutation({
    onSuccess() {
      onDeleted(scenario.id);
      setDeleteOpen(false);
      toast.success(`"${scenario.name}" deleted`);
    },
    onError() {
      toast.error(`Failed to delete "${scenario.name}". Please try again.`);
    },
  });

  return (
    <>
      <TableRow
        tabIndex={0}
        className="focus-visible:ring-ring hover:bg-muted/50 h-18 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            window.location.href = `/scenarios/${scenario.id}`;
          }
        }}
      >
        {/* Name */}
        <TableCell className="max-w-[280px] min-w-[180px]">
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/scenarios/${scenario.id}`}
              className="text-foreground text-base hover:underline focus-visible:underline focus-visible:outline-none"
              tabIndex={-1}
            >
              {scenario.name}
            </Link>
            {runCount !== undefined && (
              <span className="text-muted-foreground text-sm">
                {runCount === 0
                  ? "No runs"
                  : `${runCount} run${runCount === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        </TableCell>

        {/* Kind */}
        <TableCell className="min-w-[100px]">
          <ScenarioKindBadge kind={scenario.kind} />
        </TableCell>

        {/* Enabled toggle */}
        <TableCell>
          <ScenarioEnabledToggle
            id={scenario.id}
            initialEnabled={scenario.enabled}
            name={scenario.name}
          />
        </TableCell>

        {/* Last run */}
        <TableCell className="min-w-[140px]">
          <LastRunCell
            lastRunAt={scenario.lastRunAt}
            lastRunStatus={scenario.lastRunStatus}
            isRunning={isRunning}
          />
        </TableCell>

        {/* Actions (kebab) */}
        <TableCell className="w-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring aria-expanded:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`Scenario options for ${scenario.name}`}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                render={<Link href={`/scenarios/${scenario.id}`} />}
              >
                <Pencil className="size-4" aria-hidden />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={runNowMutation.isPending}
                onClick={() => runNowMutation.mutate({ id: scenario.id })}
              >
                {isRunning ? (
                  <Loader2
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden
                  />
                ) : (
                  <Play className="size-4" aria-hidden />
                )}
                Run now
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate({ id: scenario.id })}
              >
                {duplicateMutation.isPending ? (
                  <Loader2
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden
                  />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Delete confirmation dialog — rendered outside the table row to avoid DOM nesting issues */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{scenario.name}&rdquo;? This action cannot be
              undone. Any scheduled runs will stop immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Cancel is focused by default — safe default prevents accidental deletion */}
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: scenario.id })}
            >
              {deleteMutation.isPending ? (
                <Loader2
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden
                />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
