"use client";

import * as React from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogMedia,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

const CONFIRM_WORD = "DELETE";

interface DeleteDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDataDialog({
  open,
  onOpenChange,
}: DeleteDataDialogProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const confirmed = inputValue === CONFIRM_WORD;

  // Auto-focus input when dialog opens; reset when it closes.
  React.useEffect(() => {
    if (open) {
      // Schedule after animation frame so the dialog is fully rendered.
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setInputValue("");
    }
  }, [open]);

  const deleteAll = api.settings.deleteAllData.useMutation({
    onSuccess() {
      onOpenChange(false);
      toast.success("All data deleted successfully.");
    },
    onError() {
      toast.error("Failed to delete data. Please try again.");
    },
  });

  function handleConfirm() {
    if (!confirmed) return;
    deleteAll.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && confirmed) {
      handleConfirm();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-lg bg-white p-5 text-slate-950 shadow-lg ring-1 ring-slate-200">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50">
            <TriangleAlert
              className="size-6 text-red-600"
              aria-hidden="true"
            />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base font-semibold leading-6 text-slate-900">
            Delete all data?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-5 text-slate-500">
            This will permanently delete all ad accounts, runs, and logs.{" "}
            <strong className="font-medium text-slate-900">
              This cannot be undone.
            </strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 px-0">
          <label
            htmlFor="delete-confirm-input"
            className="block text-xs font-medium uppercase tracking-[0.04em] text-slate-500"
          >
            Type{" "}
            <span className="font-mono font-semibold text-slate-900">
              {CONFIRM_WORD}
            </span>{" "}
            to confirm
          </label>
          <Input
            id="delete-confirm-input"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="DELETE"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="delete-hint"
            aria-invalid={inputValue.length > 0 && !confirmed}
            className="h-9 rounded-md border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20"
          />
          {inputValue.length > 0 && !confirmed && (
            <p
              id="delete-hint"
              className="text-xs leading-4 text-red-600"
              role="alert"
            >
              Type DELETE in uppercase to enable the button.
            </p>
          )}
        </div>

        <AlertDialogFooter className="border-t border-slate-200 bg-slate-50">
          <AlertDialogCancel className="h-9 rounded-md border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!confirmed || deleteAll.isPending}
            onClick={handleConfirm}
            aria-disabled={!confirmed}
            className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteAll.isPending ? "Deleting…" : "Delete everything"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
