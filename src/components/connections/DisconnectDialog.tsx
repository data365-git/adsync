"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";

interface DisconnectDialogProps {
  providerName: string;
  isDisconnecting: boolean;
  onConfirm: () => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function DisconnectDialog({
  providerName,
  isDisconnecting,
  onConfirm,
  className,
  open,
  onOpenChange,
  showTrigger = true,
}: DisconnectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Disconnect ${providerName} connection`}
              className={cn(
                "h-9 rounded-md px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2",
                className,
              )}
            />
          }
        >
          Disconnect
        </AlertDialogTrigger>
      )}
      <AlertDialogContent
        size="default"
        className="rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg ring-0"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-semibold text-slate-900">
            Disconnect {providerName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500">
            Disconnecting {providerName} will pause all syncs that use this
            connection. You can reconnect at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-slate-200 bg-slate-50">
          {/* Default focus goes to Cancel — protects against accidental destructive action */}
          <AlertDialogCancel
            autoFocus
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={isDisconnecting}
            aria-label={`Confirm disconnect ${providerName}`}
            className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Disconnecting…
              </>
            ) : (
              "Disconnect"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
