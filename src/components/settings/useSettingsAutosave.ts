"use client";

import * as React from "react";
import { toast } from "sonner";

export function useSettingsAutosave<T>({
  value,
  enabled,
  save,
}: {
  value: T;
  enabled: boolean;
  save: (value: T) => Promise<unknown>;
}) {
  const baselineRef = React.useRef<string | null>(null);
  const serialized = JSON.stringify(value);

  React.useEffect(() => {
    if (!enabled) return;
    if (baselineRef.current === null) {
      baselineRef.current = serialized;
      return;
    }
    if (baselineRef.current === serialized) return;

    const timer = window.setTimeout(() => {
      void save(value)
        .then(() => {
          baselineRef.current = serialized;
          toast.success("Saved");
        })
        .catch(() => {
          toast.error("Could not save settings");
        });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [enabled, save, serialized, value]);

  const resetBaseline = React.useCallback((nextValue: T) => {
    baselineRef.current = JSON.stringify(nextValue);
  }, []);

  return { resetBaseline };
}
