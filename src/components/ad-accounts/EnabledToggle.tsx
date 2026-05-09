"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

type Props = {
  id: string;
  initialEnabled: boolean;
  label: string;
};

export function EnabledToggle({ id, initialEnabled, label }: Props) {
  const [optimisticEnabled, setOptimisticEnabled] = useState(initialEnabled);
  const inFlightRef = useRef(false);

  const toggleMutation = api.adAccounts.toggleEnabled.useMutation({
    onSuccess(data) {
      setOptimisticEnabled(data.enabled);
      inFlightRef.current = false;
    },
    onError() {
      // Revert the optimistic update
      setOptimisticEnabled((prev) => !prev);
      inFlightRef.current = false;
      toast.error("Failed to update account status. Please try again.");
    },
  });

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      // Debounce: drop rapid clicks while a call is in flight
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
      aria-label={`${optimisticEnabled ? "Disable" : "Enable"} ${label}`}
    />
  );
}
