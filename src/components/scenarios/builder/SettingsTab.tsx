"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, CopyIcon, RotateCcwIcon, AlertTriangleIcon } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "~/components/ui/alert-dialog";

interface SettingsTabProps {
  scenarioId: string;
  currentName: string;
  onNameChange: (name: string) => void;
}

export function SettingsTab({
  scenarioId,
  currentName,
  onNameChange,
}: SettingsTabProps) {
  const router = useRouter();
  const [renameValue, setRenameValue] = React.useState(currentName);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const duplicateMutation = api.scenarios.duplicate.useMutation();
  const deleteMutation = api.scenarios.delete.useMutation();

  // Keep in sync if parent name changes
  React.useEffect(() => {
    setRenameValue(currentName);
  }, [currentName]);

  function handleRenameBlur() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== currentName) {
      onNameChange(trimmed);
    } else {
      setRenameValue(currentName);
    }
  }

  async function handleDuplicate() {
    try {
      const result = await duplicateMutation.mutateAsync({ id: scenarioId });
      router.push(`/scenarios/${result.id}`);
    } catch {
      // Swallow — optimistic enough for Phase 1
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({ id: scenarioId });
      router.push("/scenarios");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete scenario.";
      setDeleteError(msg);
    }
  }

  const deleteConfirmMatch = deleteConfirmText === "DELETE";

  return (
    <div className="space-y-8">
      {/* Rename */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Rename scenario</h3>
          <p className="text-xs text-muted-foreground">
            Changes are applied immediately in the builder.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="settings-rename" className="sr-only">
              Scenario name
            </Label>
            <Input
              id="settings-rename"
              type="text"
              value={renameValue}
              maxLength={120}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              aria-label="Scenario name"
            />
          </div>
        </div>
      </section>

      {/* Duplicate */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Duplicate scenario</h3>
          <p className="text-xs text-muted-foreground">
            Creates an exact copy of this scenario with &ldquo;(copy)&rdquo; appended to the name.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleDuplicate}
          disabled={duplicateMutation.isPending}
        >
          {duplicateMutation.isPending ? (
            <>
              <RotateCcwIcon className="animate-spin" />
              Duplicating…
            </>
          ) : (
            <>
              <CopyIcon />
              Duplicate scenario
            </>
          )}
        </Button>
      </section>

      {/* Danger zone */}
      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
            <p className="text-xs text-muted-foreground">
              Deleting a scenario is permanent and cannot be undone.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            setDeleteConfirmText("");
            setDeleteError(null);
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2Icon />
          Delete scenario
        </Button>
      </section>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. Type{" "}
              <strong className="font-mono font-bold text-foreground">DELETE</strong>{" "}
              below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteConfirmMatch) {
                  void handleDelete();
                }
              }}
              placeholder="DELETE"
              aria-label="Type DELETE to confirm"
              className="font-mono"
              autoFocus
            />
          </div>

          {deleteError && (
            <p role="alert" className="text-xs text-destructive">
              {deleteError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => void handleDelete()}
              disabled={!deleteConfirmMatch || deleteMutation.isPending}
              aria-disabled={!deleteConfirmMatch || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RotateCcwIcon className="animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
