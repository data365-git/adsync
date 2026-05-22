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
  /** Called when the user confirms discard — parent should then navigate */
  onConfirmDiscard: () => void;
  /** Open state is controlled externally so the parent can trigger it */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Two-layer unsaved changes guard:
 * 1. beforeunload — prevents the browser from refreshing / closing the tab when form is dirty.
 * 2. In-app AlertDialog — shown when the user clicks Discard or tries to navigate via
 *    the sticky footer's Discard button. The App Router does not expose routeChangeStart
 *    events, so in-app navigation interception is done by asking the user before calling
 *    router.push() from the parent component.
 */
export function UnsavedChangesGuard({
  isDirty,
  onConfirmDiscard,
  open,
  onOpenChange,
}: UnsavedChangesGuardProps) {
  // beforeunload guard — browser refresh / tab close
  React.useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Modern browsers ignore the returnValue string but it must be set
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
            You have unsaved changes to this ad account. If you discard, your
            edits will be lost and cannot be recovered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
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
