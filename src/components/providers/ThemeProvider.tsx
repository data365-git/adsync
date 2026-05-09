"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "~/components/ui/button";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(
    NextThemesProvider,
    {
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
      disableTransitionOnChange: true,
    },
    children,
  );
}

const ORDER = ["light", "dark", "system"] as const;
type ThemeName = (typeof ORDER)[number];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  function cycle() {
    const current = (mounted ? theme : "system") as ThemeName;
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length] ?? "system";
    setTheme(next);
  }

  const current = (mounted ? theme : "system") as ThemeName;
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;
  const label =
    current === "dark"
      ? "Switch to system theme"
      : current === "light"
        ? "Switch to dark theme"
        : "Switch to light theme";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
