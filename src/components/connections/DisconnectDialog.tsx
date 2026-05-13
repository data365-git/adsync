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
}

export function DisconnectDialog({
  providerName,
  isDisconnecting,
  onConfirm,
  className,
}: DisconnectDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Disconnect ${providerName} connection`}
            className={cn(className)}
          />
        }
      >
        Disconnect
      </AlertDialogTrigger>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {providerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Disconnecting {providerName} will pause all syncs that use this
            connection. You can reconnect at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Default focus goes to Cancel — protects against accidental destructive action */}
          <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={isDisconnecting}
            aria-label={`Confirm disconnect ${providerName}`}
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
