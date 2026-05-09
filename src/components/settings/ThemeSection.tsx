"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, CheckIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { api } from "~/trpc/react";
import type { User } from "~/server/mocks/types";

type Theme = User["theme"];

const THEMES: { value: Theme; label: string; Icon: React.ElementType }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updateTheme = api.settings.updateTheme.useMutation({
    onError() {
      toast.error("Failed to save theme preference. Will retry next visit.");
    },
  });

  const currentTheme = (mounted ? (theme as Theme) : "system") ?? "system";

  function handleSelect(value: Theme) {
    if (value === currentTheme) return;
    // Immediate visual feedback — ThemeProvider switches instantly.
    setTheme(value);
    // Fire-and-forget API call; failure shows a toast but doesn't revert.
    updateTheme.mutate({ theme: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the dashboard looks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-3 gap-2"
        >
          {THEMES.map(({ value, label, Icon }) => {
            const selected = currentTheme === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(value)}
                className={[
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <span className="relative flex items-center justify-center">
                  <Icon className="size-5" aria-hidden="true" />
                  {selected && (
                    <span className="absolute -right-2 -top-2 flex size-3.5 items-center justify-center rounded-full bg-primary">
                      <CheckIcon className="size-2.5 text-primary-foreground" aria-hidden="true" />
                    </span>
                  )}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
