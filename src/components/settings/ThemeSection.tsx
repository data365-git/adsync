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
    <Card className="rounded-lg border border-slate-200 bg-white py-5 text-slate-950 shadow-none ring-0">
      <CardHeader className="gap-1 px-5">
        <CardTitle className="text-lg font-semibold leading-7 text-slate-900">
          Appearance
        </CardTitle>
        <CardDescription className="text-sm font-normal leading-5 text-slate-500">
          Choose how the dashboard looks.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
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
                  "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-4 text-sm font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2",
                  selected
                    ? "border-sky-600 bg-sky-50 text-slate-900"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <span className="relative flex items-center justify-center">
                  <Icon className="size-5" aria-hidden="true" />
                  {selected && (
                    <span className="absolute -right-2 -top-2 flex size-3.5 items-center justify-center rounded-full bg-sky-600">
                      <CheckIcon className="size-2.5 text-white" aria-hidden="true" />
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
