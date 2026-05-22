"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";

type Props = {
  id: string;
  label: string;
  onRunStarted?: () => void;
  onRunFinished?: () => void;
};

export function RunNowButton({
  id,
  label,
  onRunStarted,
  onRunFinished,
}: Props) {
  const [isRunning, setIsRunning] = useState(false);

  const runNowMutation = api.adAccounts.runNow.useMutation({
    onMutate() {
      setIsRunning(true);
      onRunStarted?.();
    },
    onSuccess() {
      setIsRunning(false);
      onRunFinished?.();
      toast.success(`Sync started for "${label}"`);
    },
    onError() {
      setIsRunning(false);
      onRunFinished?.();
      toast.error(`Failed to trigger sync for "${label}". Please try again.`);
    },
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={isRunning}
              onClick={() => runNowMutation.mutate({ id })}
              aria-label={`Run now: ${label}`}
              className="h-9 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
            />
          }
        >
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Play className="size-3.5" aria-hidden />
          )}
          Run now
        </TooltipTrigger>
        <TooltipContent side="top">
          Trigger an immediate sync for this account.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
