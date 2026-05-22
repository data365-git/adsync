"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

type Props = {
  id: string;
  initialEnabled: boolean;
  name: string;
};

/**
 * Optimistic enabled toggle with rapid-click race guard.
 * The switch is disabled while a call is in-flight to prevent desync.
 */
export function ScenarioEnabledToggle({ id, initialEnabled, name }: Props) {
  const [optimisticEnabled, setOptimisticEnabled] = useState(initialEnabled);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!inFlightRef.current) {
      setOptimisticEnabled(initialEnabled);
    }
  }, [initialEnabled]);

  const toggleMutation = api.scenarios.toggleEnabled.useMutation({
    onSuccess(data) {
      setOptimisticEnabled(data.enabled);
      inFlightRef.current = false;
    },
    onError() {
      // Revert optimistic update
      setOptimisticEnabled((prev) => !prev);
      inFlightRef.current = false;
      toast.error("Failed to update scenario status. Please try again.");
    },
  });

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      // Drop rapid clicks while a call is in flight
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setOptimisticEnabled(checked);
      toggleMutation.mutate({ id, enabled: checked });
    },
    [id, toggleMutation],
  );

  return (
    <Switch
      checked={optimisticEnabled}
      onCheckedChange={handleCheckedChange}
      disabled={toggleMutation.isPending}
      aria-label={`${optimisticEnabled ? "Disable" : "Enable"} ${name}`}
      className="data-checked:bg-sky-600 data-unchecked:bg-slate-200 [&_[data-slot=switch-thumb]]:bg-white"
    />
  );
}
