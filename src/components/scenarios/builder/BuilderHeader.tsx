"use client";

import * as React from "react";
import {
  SaveIcon,
  PlayIcon,
  RotateCcwIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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
}: BuilderHeaderProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editValue, setEditValue] = React.useState(name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Sync if name prop changes externally
  React.useEffect(() => {
    if (!isEditingName) {
      setEditValue(name);
    }
  }, [name, isEditingName]);

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

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
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

        {/* Scenario name — inline editable */}
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
    </div>
  );
}
