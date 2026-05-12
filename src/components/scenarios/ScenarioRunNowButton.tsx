"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

type Props = {
  id: string;
  name: string;
  /** Called after a successful run to update last-run display in parent */
  onRunStarted?: () => void;
};

/**
 * Standalone run-now button for use outside the kebab menu (e.g., mobile card footer).
 * For in-kebab usage, use useScenarioRunNow hook.
 */
export function ScenarioRunNowButton({ id, name, onRunStarted }: Props) {
  const [isRunning, setIsRunning] = useState(false);

  const runNowMutation = api.scenarios.runNow.useMutation({
    onMutate() {
      setIsRunning(true);
    },
    onSuccess() {
      setIsRunning(false);
      onRunStarted?.();
      toast.success(`Run started for "${name}"`);
    },
    onError() {
      setIsRunning(false);
      toast.error(`Failed to trigger run for "${name}". Please try again.`);
    },
  });

  return (
    <button
      type="button"
      disabled={runNowMutation.isPending}
      onClick={() => runNowMutation.mutate({ id })}
      aria-label={`Run now: ${name}`}
      className="border-border bg-background hover:bg-muted focus-visible:ring-ring inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    >
      {isRunning ? (
        <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
      ) : (
        <Play className="size-3.5" aria-hidden />
      )}
      Run now
    </button>
  );
}
