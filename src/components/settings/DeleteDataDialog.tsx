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

export function DeleteDataDialog({ open, onOpenChange }: DeleteDataDialogProps) {
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-error/10">
            <TriangleAlert className="size-6 text-error" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete all data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all ad accounts, runs, and logs.{" "}
            <strong className="text-foreground">This cannot be undone.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 px-0">
          <label
            htmlFor="delete-confirm-input"
            className="block text-xs font-medium text-muted-foreground"
          >
            Type{" "}
            <span className="font-mono font-semibold text-foreground">
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
          />
          {inputValue.length > 0 && !confirmed && (
            <p id="delete-hint" className="text-xs text-error" role="alert">
              Type DELETE in uppercase to enable the button.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!confirmed || deleteAll.isPending}
            onClick={handleConfirm}
            aria-disabled={!confirmed}
          >
            {deleteAll.isPending ? "Deleting…" : "Delete everything"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
