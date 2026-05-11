"use client";

import * as React from "react";
import Link from "next/link";
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
import { humanizeCronShort, nextFireAt } from "~/lib/cron-builder";
import { MODULES } from "~/lib/modules";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import type { DraftStep } from "./StepCard";
import type { Run } from "~/server/mocks/types";

// ─── summarizeSteps ───────────────────────────────────────────────────────────

function toStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return "";
}

function summarizeSteps(steps: DraftStep[]): string {
  if (steps.length === 0) return "";
  const parts = steps.map((s) => {
    if (s.moduleType === "trigger.schedule") {
      const cron = toStr(s.config.cronExpression);
      return cron ? humanizeCronShort(cron) : "Schedule";
    }
    if (s.moduleType === "trigger.manual") return "Manual";
    return MODULES.find((m) => m.id === s.moduleType)?.shortName ?? s.moduleType;
  });
  return parts.join(" → ");
}

// ─── formatCountdown ─────────────────────────────────────────────────────────

function formatCountdown(targetMs: number, nowMs: number): string {
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "now";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BuilderHeaderProps {
  name: string;
  enabled: boolean;
  isSaving: boolean;
  isTesting: boolean;
  isDirty: boolean;
  missingFieldsTooltip: string | null;
  onNameChange: (name: string) => void;
  onEnabledToggle: (enabled: boolean) => void;
  onSave: () => void;
  onTest: () => void;
  onBack: () => void;
  /** Current draft steps — used for auto-summary subtitle and next-run countdown */
  steps?: DraftStep[];
  /** scenarioId — required for Run now. Omit for new scenario (not yet saved). */
  scenarioId?: string;
  /** Run history for this scenario — used for the run glance strip */
  scenarioRuns?: Run[];
}

export function BuilderHeader({
  name,
  enabled,
  isSaving,
  isTesting,
  isDirty,
  missingFieldsTooltip,
  onNameChange,
  onEnabledToggle,
  onSave,
  onTest,
  onBack,
  steps = [],
  scenarioId,
  scenarioRuns = [],
}: BuilderHeaderProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editValue, setEditValue] = React.useState(name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Next-run countdown state
  const [nextRunLabel, setNextRunLabel] = React.useState<string | null>(null);
  const [isRunningNow, setIsRunningNow] = React.useState(false);

  const runNowMutation = api.scenarios.runNow.useMutation();

  // Sync name if changed externally
  React.useEffect(() => {
    if (!isEditingName) {
      setEditValue(name);
    }
  }, [name, isEditingName]);

  // Compute and refresh next-run countdown every 60s
  React.useEffect(() => {
    if (!enabled) {
      setNextRunLabel(null);
      return;
    }
    const triggerStep = steps.find((s) => s.moduleType === "trigger.schedule");
    if (!triggerStep) {
      setNextRunLabel(null);
      return;
    }
    const cronExpr = toStr(triggerStep.config.cronExpression);
    const timezone = toStr(triggerStep.config.timezone);
    if (!cronExpr) {
      setNextRunLabel(null);
      return;
    }

    function refresh() {
      const now = new Date();
      const next = nextFireAt(cronExpr, timezone, now);
      if (!next) {
        setNextRunLabel(null);
        return;
      }
      const label = formatCountdown(next.getTime(), now.getTime());
      setNextRunLabel(`Next run in ${label}`);
    }

    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [enabled, steps]);

  // Derived run-history glance from real mock data
  const runGlance = React.useMemo(() => {
    if (scenarioRuns.length === 0) return null;
    const total = scenarioRuns.length;
    const succeeded = scenarioRuns.filter((r) => r.status === "success").length;
    const failed = scenarioRuns.filter((r) => r.status === "failed").length;
    return { total, succeeded, failed };
  }, [scenarioRuns]);

  async function handleRunNow() {
    if (!scenarioId || isRunningNow) return;
    setIsRunningNow(true);
    try {
      const run = await runNowMutation.mutateAsync({ id: scenarioId });
      // Small visual pause so the spinner is visible (mock is instant)
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      router.push(`/runs/${run.id}`);
    } catch {
      // Toast would go here in Phase 2 — for Phase 1 we restore the button state
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
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed);
    } else {
      setEditValue(name);
    }
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      setEditValue(name);
      setIsEditingName(false);
    }
  }

  const saveDisabled = isSaving || !!missingFieldsTooltip;
  const subtitle = summarizeSteps(steps);

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Row 1: breadcrumb + name + controls */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1">
        {/* Back button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back to scenarios"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>

        {/* Breadcrumb + name */}
        <div className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <p className="hidden text-xs text-muted-foreground sm:block">
            <Link
              href="/scenarios"
              className="hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Scenarios
            </Link>
            {" / "}
          </p>

          {/* Inline-editable scenario name */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleNameKeyDown}
              maxLength={120}
              className="w-full rounded border border-ring bg-transparent px-1.5 py-0.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/50"
              aria-label="Scenario name"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="truncate rounded px-1.5 py-0.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Scenario name: ${name}. Click to edit.`}
              title="Click to edit name"
            >
              {name || "Untitled scenario"}
            </button>
          )}

          {/* Auto-summary subtitle */}
          {subtitle && (
            <p className="truncate px-1.5 text-xs text-muted-foreground" aria-label="Scenario steps summary">
              {subtitle}
            </p>
          )}
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledToggle}
            size="sm"
            aria-label={enabled ? "Scenario enabled" : "Scenario disabled"}
          />
          <span className="hidden text-xs text-muted-foreground sm:block">
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {/* Unsaved indicator */}
        {isDirty && (
          <span className="hidden items-center gap-1 text-xs text-amber-600 sm:flex" aria-live="polite">
            <span className="inline-block size-1.5 rounded-full bg-amber-500" />
            Unsaved
          </span>
        )}

        {/* Test button */}
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

        {/* Run now button — only when scenarioId is known */}
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

        {/* Save button — with tooltip when disabled */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <span tabIndex={saveDisabled ? 0 : -1} className="inline-flex" />
              }
            >
              <Button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                aria-disabled={saveDisabled}
                aria-describedby={missingFieldsTooltip ? "save-tooltip" : undefined}
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

      {/* Row 2: status strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-6 pb-2 text-xs text-muted-foreground">
        {/* Enabled indicator dot */}
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block size-2 rounded-full ${enabled ? "bg-green-500" : "bg-muted-foreground"}`}
            aria-hidden="true"
          />
          <span>{enabled ? "Enabled" : "Disabled"}</span>
        </span>

        {/* Next-run countdown (schedule trigger + enabled only) */}
        {nextRunLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span>{nextRunLabel}</span>
          </>
        )}

        {/* Run-history glance — derived from scenarioRuns (real mock data) */}
        {runGlance && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {runGlance.total} run{runGlance.total !== 1 ? "s" : ""}
              {" · "}
              <span className="text-green-600 dark:text-green-400">{runGlance.succeeded} succeeded</span>
              {" · "}
              <span className="text-red-600 dark:text-red-400">{runGlance.failed} failed</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
