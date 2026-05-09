"use client";

import * as React from "react";
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

interface UnsavedChangesGuardProps {
  isDirty: boolean;
  onConfirmDiscard: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Guards against accidental navigation away from an unsaved scenario.
 * Uses beforeunload for browser-level guard (refresh, close tab).
 * The AlertDialog is shown by the parent when the user tries to navigate
 * via in-app controls (Back, Cancel, etc.).
 */
export function UnsavedChangesGuard({
  isDirty,
  onConfirmDiscard,
  open,
  onOpenChange,
}: UnsavedChangesGuardProps) {
  React.useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to this scenario. If you leave now, your
            edits will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            onClick={() => {
              onOpenChange(false);
              onConfirmDiscard();
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
