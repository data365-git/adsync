"use client";

import * as React from "react";
import {
  SaveIcon,
  PlayIcon,
  RotateCcwIcon,
  ArrowLeftIcon,
  ZapIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import type { DraftStep } from "./StepCard";
import type { Run } from "~/server/mocks/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BuilderHeaderProps {
  name: string;
  enabled: boolean;
  isSaving: boolean;
  /** True while a background autosave round-trip is in flight */
  isAutosaving?: boolean;
  /** Timestamp of the last successful save (autosave or explicit). null if never saved this session. */
  lastSavedAt?: Date | null;
  isTesting: boolean;
  isDirty: boolean;
  missingFieldsTooltip: string | null;
  onNameChange: (name: string) => void;
  onEnabledToggle: (enabled: boolean) => void;
  onSave: () => void;
  onTest: () => void;
  onBack: () => void;
  /** Current draft steps — kept for API compatibility; unused in the simplified Zapier-style header */
  steps?: DraftStep[];
  /** scenarioId — required for Run now. Omit for new scenario (not yet saved). */
  scenarioId?: string;
  /** Run history — kept for API compatibility */
  scenarioRuns?: Run[];
}

/**
 * Fixed-position header bar for the scenario builder. Uses `position: fixed`
 * (not sticky) because the dashboard layout doesn't establish an explicit
 * scroll container; sticky was visually scrolling away with content.
 *
 * Spans from the sidebar's right edge (or 0 on mobile) to the viewport's
 * right edge. The ScenarioBuilderWithTabs wrapper reserves equivalent
 * top-padding (`HEADER_HEIGHT_PX`) so the body content doesn't sit underneath.
 */
export const BUILDER_HEADER_HEIGHT_PX = 60;

export function BuilderHeader({
  name,
  enabled,
  isSaving,
  isAutosaving = false,
  lastSavedAt = null,
  isTesting,
  isDirty,
  missingFieldsTooltip,
  onNameChange,
  onEnabledToggle,
  onSave,
  onTest,
  onBack,
  scenarioId,
}: BuilderHeaderProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editValue, setEditValue] = React.useState(name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [isRunningNow, setIsRunningNow] = React.useState(false);

  const runNowMutation = api.scenarios.runNow.useMutation();

  React.useEffect(() => {
    if (!isEditingName) setEditValue(name);
  }, [name, isEditingName]);

  async function handleRunNow() {
    if (!scenarioId || isRunningNow) return;
    setIsRunningNow(true);
    try {
      const run = await runNowMutation.mutateAsync({ id: scenarioId });
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      router.push(`/runs/${run.id}`);
    } catch {
      setIsRunningNow(false);
    }
  }

  function startEdit() {
    setEditValue(name);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) onNameChange(trimmed);
    else setEditValue(name);
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    else if (e.key === "Escape") {
      setEditValue(name);
      setIsEditingName(false);
    }
  }

  const saveDisabled = isSaving || !!missingFieldsTooltip;

  return (
    <header
      className="border-border bg-background fixed top-0 right-0 left-0 z-30 flex items-center gap-3 border-b px-4 md:left-60 md:px-6"
      style={{ height: BUILDER_HEADER_HEIGHT_PX }}
      role="banner"
    >
      {/* Back */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onBack}
        aria-label="Back to scenarios"
        className="shrink-0"
      >
        <ArrowLeftIcon className="size-4" />
      </Button>

      {/* Name — inline editable, takes available space */}
      <div className="min-w-0 flex-1">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleNameKeyDown}
            maxLength={120}
            className="border-ring focus:ring-ring/50 w-full max-w-md rounded border bg-transparent px-1.5 py-1 text-base outline-none focus:ring-2"
            aria-label="Scenario name"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="hover:bg-muted focus-visible:ring-ring -ml-0.5 block max-w-full truncate rounded px-1.5 py-1 text-base text-foreground focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`Scenario name: ${name}. Click to edit.`}
            title="Click to edit name"
          >
            {name || "Untitled scenario"}
          </button>
        )}
      </div>

      {/* Right cluster: subtle save state · enabled · test · run now · save */}
      <div className="flex shrink-0 items-center gap-2">
        <SaveStatus
          isAutosaving={isAutosaving || isSaving}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
        />

        <div className="flex items-center gap-1.5">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledToggle}
            size="sm"
            aria-label={enabled ? "Scenario enabled" : "Scenario disabled"}
          />
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTesting}
          aria-label="Run test"
        >
          {isTesting ? (
            <>
              <RotateCcwIcon className="animate-spin" />
              Testing…
            </>
          ) : (
            <>
              <PlayIcon />
              Test
            </>
          )}
        </Button>

        {scenarioId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRunNow()}
            disabled={isRunningNow}
            aria-label="Run scenario now"
          >
            {isRunningNow ? (
              <>
                <RotateCcwIcon className="animate-spin" />
                Running…
              </>
            ) : (
              <>
                <ZapIcon />
                Run now
              </>
            )}
          </Button>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={saveDisabled ? 0 : -1}
                  className="inline-flex"
                />
              }
            >
              <Button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                aria-disabled={saveDisabled}
                aria-describedby={
                  missingFieldsTooltip ? "save-tooltip" : undefined
                }
              >
                {isSaving ? (
                  <>
                    <RotateCcwIcon className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    Save
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {missingFieldsTooltip && (
              <TooltipContent id="save-tooltip" side="bottom">
                {missingFieldsTooltip}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}

// ─── SaveStatus ───────────────────────────────────────────────────────────────

function formatSavedAgo(savedAt: Date, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - savedAt.getTime()) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h ago`;
}

function SaveStatus({
  isAutosaving,
  isDirty,
  lastSavedAt,
}: {
  isAutosaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
}) {
  const [nowMs, setNowMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  if (isAutosaving) {
    return (
      <span
        className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex"
        aria-live="polite"
      >
        <RotateCcwIcon className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (!isDirty && lastSavedAt && nowMs !== null) {
    return (
      <span
        className="hidden items-center gap-1.5 text-xs text-emerald-600 sm:flex dark:text-emerald-400"
        aria-live="polite"
      >
        <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
        Saved · {formatSavedAgo(lastSavedAt, nowMs)}
      </span>
    );
  }

  if (isDirty) {
    return (
      <span
        className="hidden items-center gap-1.5 text-xs text-amber-600 sm:flex"
        aria-live="polite"
      >
        <span className="inline-block size-1.5 rounded-full bg-amber-500" />
        Unsaved
      </span>
    );
  }

  return null;
}
