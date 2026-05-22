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
  FolderInput,
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
import { Checkbox } from "~/components/ui/checkbox";
import { TableCell, TableRow } from "~/components/ui/table";
import { api } from "~/trpc/react";
import type { Scenario } from "~/server/mocks/types";
import { ScenarioKindBadge } from "./ScenarioKindBadge";
import { ScenarioEnabledToggle } from "./ScenarioEnabledToggle";
import { LastRunCell } from "./LastRunCell";
import { MoveToFolderDialog } from "./MoveToFolderDialog";
import { highlight } from "~/lib/highlight";

type Props = {
  scenario: Scenario;
  runCount?: number;
  onDuplicated: (newScenario: Scenario) => void;
  onDeleted: (id: string) => void;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  searchQuery?: string;
  draggable?: boolean;
};

export function ScenarioRow({
  scenario,
  runCount,
  onDuplicated,
  onDeleted,
  selected,
  onSelectedChange,
  searchQuery,
  draggable = false,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
        draggable={draggable}
        onDragStart={(event) => {
          if (!draggable) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/scenario-id", scenario.id);
          setIsDragging(true);
        }}
        onDragEnd={() => setIsDragging(false)}
        className={`h-13 cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none focus-visible:ring-inset ${
          isDragging ? "opacity-50" : ""
        }`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            window.location.href = `/scenarios/${scenario.id}`;
          }
        }}
      >
        {/* Select */}
        <TableCell className="w-10 px-4 py-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label={`Select scenario ${scenario.name}`}
          />
        </TableCell>

        {/* Name */}
        <TableCell className="max-w-[280px] min-w-[180px] py-3 pr-4 pl-5">
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/scenarios/${scenario.id}`}
              className="text-foreground text-base hover:underline focus-visible:underline focus-visible:outline-none"
              tabIndex={-1}
            >
              {searchQuery?.trim()
                ? highlight(scenario.name, searchQuery)
                : scenario.name}
            </Link>
            {"description" in scenario &&
              typeof scenario.description === "string" &&
              scenario.description.trim() && (
                <span className="truncate text-xs text-slate-500">
                  {searchQuery?.trim()
                    ? highlight(scenario.description, searchQuery)
                    : scenario.description}
                </span>
              )}
            {runCount !== undefined && (
              <span className="text-xs text-slate-500">
                {runCount === 0
                  ? "No runs"
                  : `${runCount} run${runCount === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        </TableCell>

        {/* Kind */}
        <TableCell className="min-w-[100px] px-4 py-3">
          <ScenarioKindBadge kind={scenario.kind} />
        </TableCell>

        {/* Enabled toggle */}
        <TableCell className="px-4 py-3">
          <ScenarioEnabledToggle
            id={scenario.id}
            initialEnabled={scenario.enabled}
            name={scenario.name}
          />
        </TableCell>

        {/* Last run */}
        <TableCell className="min-w-[140px] px-4 py-3">
          <LastRunCell
            lastRunAt={scenario.lastRunAt}
            lastRunStatus={scenario.lastRunStatus}
            isRunning={isRunning}
          />
        </TableCell>

        {/* Actions (kebab) */}
        <TableCell className="w-10 px-4 py-3">
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
              <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                <FolderInput className="size-4" aria-hidden />
                Move to folder
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

      {/* Move to folder dialog */}
      <MoveToFolderDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        scenarioIds={[scenario.id]}
        currentParentId={scenario.folderId ?? null}
        onMoved={() => {
          // Parent will invalidate via its own query
        }}
      />
    </>
  );
}
