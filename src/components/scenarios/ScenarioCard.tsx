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

export function ScenarioCard({
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
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
        {/* Header: name + badge + kebab */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <Link
              href={`/scenarios/${scenario.id}`}
              className="font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none truncate"
            >
              {scenario.name}
            </Link>
            <div className="flex items-center gap-2">
              <ScenarioKindBadge kind={scenario.kind} />
              {runCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {runCount === 0
                    ? "No runs"
                    : `${runCount} run${runCount === 1 ? "" : "s"}`}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-muted"
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
                onClick={() =>
                  duplicateMutation.mutate({ id: scenario.id })
                }
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
        </div>

        {/* Last run */}
        <div className="flex items-start gap-2">
          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
            Last run:
          </span>
          <LastRunCell
            lastRunAt={scenario.lastRunAt}
            lastRunStatus={scenario.lastRunStatus}
            isRunning={isRunning}
          />
        </div>

        {/* Footer: enabled toggle + run now */}
        <div className="flex items-center justify-between gap-3 border-t pt-2">
          <div className="flex items-center gap-2">
            <ScenarioEnabledToggle
              id={scenario.id}
              initialEnabled={scenario.enabled}
              name={scenario.name}
            />
            <span className="text-xs text-muted-foreground">
              {scenario.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <button
            type="button"
            disabled={runNowMutation.isPending}
            onClick={() => runNowMutation.mutate({ id: scenario.id })}
            aria-label={`Run now: ${scenario.name}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
            Run now
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
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
            {/* Cancel focused by default — safe default prevents accidental deletion */}
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
