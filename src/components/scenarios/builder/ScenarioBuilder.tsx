"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";
import { BuilderHeader, BUILDER_HEADER_HEIGHT_PX } from "./BuilderHeader";
import { StepCard, validateStepConfig, type DraftStep } from "./StepCard";
import { StepConnector } from "./StepConnector";
import { AddStepButton } from "./AddStepButton";
import { ModuleLibraryModal } from "./ModuleLibraryModal";
import { StepConfigModal } from "./StepConfigModal";
import { TestRunPanel } from "./TestRunPanel";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

// DraftStep re-exported from StepCard (single source of truth)
export type { DraftStep };

type TestStepResult = {
  stepId: string;
  status: "success" | "failed";
  output: Record<string, unknown>;
  durationMs: number;
};

// ─── Helpers (exported so detail page can reuse) ─────────────────────────────

let _stepCounter = 0;
export function newStepId() {
  _stepCounter += 1;
  return `draft_step_${Date.now()}_${_stepCounter}`;
}

export function defaultConfigFor(moduleType: ModuleType): Record<string, unknown> {
  switch (moduleType) {
    case "trigger.schedule":
      return { cronExpression: "", timezone: "Asia/Tashkent" };
    case "trigger.manual":
      return {};
    case "trigger.webhook":
      return { secret: "" };
    case "sheets.append":
      return { spreadsheetId: "", tabName: "", mappedFields: {} };
    case "sheets.upsert":
      return { spreadsheetId: "", tabName: "", keyFields: [], mappedFields: {} };
    case "sheets.update_row":
      return { spreadsheetId: "", tabName: "", rowIdentifier: "", mappedFields: {} };
    case "sheets.find_rows":
      return { spreadsheetId: "", tabName: "", searchColumn: "", searchValue: "" };
    case "trigger.watch.sheets_new_rows":
      return { spreadsheetId: "", tabName: "", watchColumn: "" };
    case "bitrix.create_lead":
      return { title: "", name: "", lastName: "", phone: "", email: "", sourceId: "", comments: "" };
    case "bitrix.update_lead":
      return { leadId: "", title: "", statusId: "", comments: "" };
    case "bitrix.delete_lead":
      return { leadId: "" };
    case "bitrix.create_deal":
      return { portalId: "", title: "", categoryId: "", stageId: "" };
    default:
      // Phase 3 module config defaults are populated by their individual
      // config form components in Stage 1'. Empty object is a safe baseline.
      return {};
  }
}

/**
 * When swapping the trigger module, keep config keys that exist in BOTH the
 * old and new module's `configSchema`; default-fill the rest. Same module ⇒
 * config is preserved as-is.
 */
export function preserveCompatibleTriggerConfig(
  oldType: ModuleType,
  newType: ModuleType,
  oldConfig: Record<string, unknown>,
): Record<string, unknown> {
  if (oldType === newType) return oldConfig;
  const oldMod = getModule(oldType);
  const newMod = getModule(newType);
  if (!oldMod || !newMod) return defaultConfigFor(newType);
  const oldKeys = new Set(oldMod.configSchema.map((f) => f.key));
  const preserved: Record<string, unknown> = {};
  for (const field of newMod.configSchema) {
    if (oldKeys.has(field.key) && field.key in oldConfig) {
      preserved[field.key] = oldConfig[field.key];
    }
  }
  return { ...defaultConfigFor(newType), ...preserved };
}

export function computeMissingTooltip(steps: DraftStep[]): string | null {
  if (steps.length === 0) return "Add at least one step.";
  const missingSteps: number[] = [];
  for (const step of steps) {
    const errs = validateStepConfig(step.moduleType, step.config);
    if (Object.keys(errs).length > 0) missingSteps.push(step.position);
  }
  if (missingSteps.length === 0) return null;
  const count = missingSteps.reduce((acc, pos) => {
    const s = steps.find((st) => st.position === pos);
    if (!s) return acc;
    return acc + Object.keys(validateStepConfig(s.moduleType, s.config)).length;
  }, 0);
  const stepList = missingSteps.join(", ");
  return `${count} required field${count !== 1 ? "s" : ""} missing in step${missingSteps.length !== 1 ? "s" : ""} ${stepList}`;
}

// ─── EmptyStepSlot ───────────────────────────────────────────────────────────
// Shown when the next step in the chain isn't picked yet.
// Opens ModuleLibraryModal — the single source of truth for available modules.

interface EmptyStepSlotProps {
  kind: "trigger" | "action";
  onOpenLibrary: () => void;
}

function EmptyStepSlot({ kind, onOpenLibrary }: EmptyStepSlotProps) {
  const isTrigger = kind === "trigger";
  const title = isTrigger ? "Step 1: When this happens..." : "Step 2: Then do this...";
  const helper = isTrigger
    ? "Pick a trigger - Schedule, Webhook, Manual run, or watch a Sheet/Bitrix list for new items."
    : "Pick an action - pull Facebook insights, write to Sheets, or create/update Bitrix records.";
  return (
    <button
      type="button"
      onClick={onOpenLibrary}
      className={cn(
        "mt-4 flex w-full flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6 text-left",
        "transition-colors hover:border-primary/40 hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{helper}</span>
      <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
        + Choose module
      </span>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScenarioBuilderProps {
  /** Pre-populated name (from template) */
  initialName?: string;
  /** Pre-populated steps (from template) */
  initialSteps?: DraftStep[];
  /** Folder where a newly-created scenario should be placed. */
  initialFolderId?: string | null;
}

// ─── New-scenario builder (no tabs) ──────────────────────────────────────────

export function ScenarioBuilder({
  initialName,
  initialSteps,
  initialFolderId = null,
}: ScenarioBuilderProps) {
  const router = useRouter();

  // Stable initial trigger id — must NOT call Date.now() here, otherwise SSR
  // and client hydration produce different keys for the same step and React
  // throws a hydration mismatch. newStepId() is only used for steps added by
  // user actions (event handlers), which run post-hydration.
  const startingSteps: DraftStep[] = React.useMemo(() => {
    if (initialSteps && initialSteps.length > 0) return initialSteps;
    return [
      {
        id: "draft_step_trigger",
        position: 1,
        moduleType: "trigger.manual",
        config: {},
      },
    ];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [name, setName] = React.useState(
    initialName?.trim() ? initialName : "Untitled scenario",
  );
  const [enabled, setEnabled] = React.useState(false);
  const [steps, setSteps] = React.useState<DraftStep[]>(startingSteps);

  // C.3: First step expanded by default; single-expand model
  const [expandedStepId, setExpandedStepId] = React.useState<string | null>(
    startingSteps.length > 0 ? (startingSteps[0]?.id ?? null) : null,
  );

  // C.4: Track whether trigger has been explicitly chosen in the picker
  // Initially false so we show the trigger picker for a fresh scenario
  const [triggerChosen, setTriggerChosen] = React.useState(
    () => !!(initialSteps && initialSteps.length > 0),
  );

  const [showErrors, setShowErrors] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const [showTestPanel, setShowTestPanel] = React.useState(false);
  const [testResults, setTestResults] = React.useState<TestStepResult[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalInsertAt, setModalInsertAt] = React.useState(1);
  const [modalMode, setModalMode] = React.useState<"insert" | "replace-trigger">(
    "insert",
  );
  const [liftedStepId, setLiftedStepId] = React.useState<string | null>(null);

  const createMutation = api.scenarios.create.useMutation();
  const testRunMutation = api.scenarios.testRun.useMutation();

  const isSaving = createMutation.isPending;
  const isTesting = testRunMutation.isPending;

  // Dirty: any change from defaults
  const isDirty = React.useMemo(() => {
    const defaultName = initialName ?? "Untitled scenario";
    if (name !== defaultName) return true;
    if (steps.length !== startingSteps.length) return true;
    return false;
  }, [name, steps.length, initialName, startingSteps.length]);

  const missingFieldsTooltip = computeMissingTooltip(steps);
  const actionSteps = steps.slice(1);

  // C.4: Whether to show pickers
  // Show trigger picker if trigger hasn't been chosen yet
  const showTriggerPicker = !triggerChosen;
  // Show action picker if trigger is chosen but no action steps yet
  const showActionPicker = triggerChosen && steps.length === 1;
  // Standard "Add step" is shown when trigger + ≥1 action exist
  const showStandardAdd = triggerChosen && steps.length > 1;

  function openModuleLibrary(insertAt: number) {
    setModalMode("insert");
    setModalInsertAt(insertAt);
    setModalOpen(true);
  }

  function openTriggerLibrary() {
    setModalMode("replace-trigger");
    setModalInsertAt(1);
    setModalOpen(true);
  }

  function handleSelectModule(moduleType: ModuleType, insertAt: number) {
    if (modalMode === "replace-trigger" || (insertAt === 1 && !triggerChosen)) {
      const triggerId = steps[0]?.id ?? null;
      setSteps((prev) =>
        prev.map((s) =>
          s.position === 1
            ? {
                ...s,
                moduleType,
                config: preserveCompatibleTriggerConfig(
                  s.moduleType,
                  moduleType,
                  s.config,
                ),
              }
            : s,
        ),
      );
      setTriggerChosen(true);
      setExpandedStepId(triggerId);
      setModalOpen(false);
      setModalMode("insert");
      return;
    }
    const newStep: DraftStep = {
      id: newStepId(),
      position: insertAt,
      moduleType,
      config: defaultConfigFor(moduleType),
    };
    setSteps((prev) => {
      const updated = [
        ...prev.slice(0, insertAt - 1),
        newStep,
        ...prev.slice(insertAt - 1),
      ].map((s, idx) => ({ ...s, position: idx + 1 }));
      return updated;
    });
    // C.3: single-expand — open new step, collapse others
    setExpandedStepId(newStep.id);
    setModalOpen(false);
  }

  function handleDeleteStep(stepId: string) {
    setSteps((prev) =>
      prev.filter((s) => s.id !== stepId).map((s, idx) => ({ ...s, position: idx + 1 })),
    );
    setExpandedStepId((prev) => (prev === stepId ? null : prev));
  }

  function handleConfigChange(stepId: string, config: Record<string, unknown>) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, config } : s)));
  }

  function handleToggleExpand(stepId: string) {
    // Single-expand model: close if already open, open and close others otherwise
    setExpandedStepId((prev) => (prev === stepId ? null : stepId));
  }

  function handleDragKeyDown(stepId: string, e: React.KeyboardEvent) {
    const step = steps.find((s) => s.id === stepId);
    if (!step || step.position === 1) return;
    if (e.key === " ") {
      e.preventDefault();
      setLiftedStepId((prev) => (prev === stepId ? null : stepId));
    }
    if (liftedStepId === stepId) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSteps((prev) => {
          const idx = prev.findIndex((s) => s.id === stepId);
          if (idx <= 1) return prev;
          const next = [...prev];
          [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
          return next.map((s, i) => ({ ...s, position: i + 1 }));
        });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSteps((prev) => {
          const idx = prev.findIndex((s) => s.id === stepId);
          if (idx >= prev.length - 1) return prev;
          const next = [...prev];
          [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
          return next.map((s, i) => ({ ...s, position: i + 1 }));
        });
      }
      if (e.key === "Escape") setLiftedStepId(null);
    }
  }

  const dragStepRef = React.useRef<string | null>(null);
  const dragOverRef = React.useRef<string | null>(null);

  function handleDrop() {
    const fromId = dragStepRef.current;
    const toId = dragOverRef.current;
    if (!fromId || !toId || fromId === toId) {
      dragStepRef.current = null;
      dragOverRef.current = null;
      return;
    }
    setSteps((prev) => {
      const fromIdx = prev.findIndex((s) => s.id === fromId);
      const toIdx = prev.findIndex((s) => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      if (moved) next.splice(toIdx, 0, moved);
      return next.map((s, i) => ({ ...s, position: i + 1 }));
    });
    dragStepRef.current = null;
    dragOverRef.current = null;
  }

  async function handleSave() {
    setShowErrors(true);
    if (missingFieldsTooltip) return;
    setSaveError(null);
    // Guard against an empty name (e.g. "Start from scratch" seeds it blank) —
    // the create mutation requires min(1). Fall back to a sensible default.
    const safeName = name.trim() || "Untitled scenario";
    if (safeName !== name) setName(safeName);
    try {
      const result = await createMutation.mutateAsync({
        name: safeName,
        enabled,
        folderId: initialFolderId,
        steps: steps.map((s) => ({
          position: s.position,
          moduleType: s.moduleType,
          config: s.config,
        })),
      });
      router.push(`/scenarios/${result.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setSaveError(msg);
    }
  }

  async function handleTest() {
    // Block test runs on incomplete scenarios — reveal field errors instead.
    if (missingFieldsTooltip) {
      setShowErrors(true);
      toast.error(missingFieldsTooltip);
      return;
    }
    setShowTestPanel(true);
    setTestResults([]);
    try {
      // Use a known scenario id for the mock test run
      const results = await testRunMutation.mutateAsync({ id: "scn_custom_01" });
      setTestResults(results);
    } catch (err) {
      setShowTestPanel(false);
      setShowErrors(true);
      toast.error(
        err instanceof Error ? err.message : "Test run failed. Please try again.",
      );
    }
  }

  function handleBack() {
    if (isDirty) {
      setDiscardDialogOpen(true);
    } else {
      router.push("/scenarios");
    }
  }

  return (
    <>
      <UnsavedChangesGuard
        isDirty={isDirty}
        onConfirmDiscard={() => router.push("/scenarios")}
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
      />

      <ModuleLibraryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        insertAtPosition={modalInsertAt}
        onSelectModule={handleSelectModule}
        isTriggerSlot={modalMode === "replace-trigger" || modalInsertAt === 1}
      />

      {/* Step configuration modal — opens when the user clicks a step card. */}
      <StepConfigModal
        open={expandedStepId !== null}
        onOpenChange={(o) => {
          if (!o) setExpandedStepId(null);
        }}
        step={steps.find((s) => s.id === expandedStepId) ?? null}
        steps={steps}
        prevStepModuleType={
          (() => {
            const idx = steps.findIndex((s) => s.id === expandedStepId);
            if (idx <= 0) return undefined;
            return steps[idx - 1]?.moduleType;
          })()
        }
        onConfigChange={(config) => {
          if (expandedStepId) handleConfigChange(expandedStepId, config);
        }}
        showErrors={showErrors}
      />

      <BuilderHeader
        name={name}
        enabled={enabled}
        isSaving={isSaving}
        isTesting={isTesting}
        isDirty={isDirty}
        missingFieldsTooltip={showErrors ? missingFieldsTooltip : null}
        validationError={missingFieldsTooltip}
        onRevealErrors={() => setShowErrors(true)}
        onNameChange={setName}
        onEnabledToggle={setEnabled}
        onSave={() => void handleSave()}
        onTest={() => void handleTest()}
        onBack={handleBack}
        steps={steps}
      />
      {/* Reserve space for the fixed header */}
      <div style={{ height: BUILDER_HEADER_HEIGHT_PX }} aria-hidden />

      {/* Canvas — adds bottom padding when test panel is open */}
      <div className={cn("mx-auto max-w-2xl px-4 py-6", showTestPanel ? "pb-[280px]" : "pb-24")}>
        {saveError && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <span className="mt-0.5 shrink-0" aria-hidden="true">&#x26A0;</span>
            <div>
              <p className="font-medium">Failed to save scenario</p>
              <p className="mt-0.5 text-xs">{saveError}</p>
            </div>
          </div>
        )}

        {/* C.4 — Trigger empty slot: shown before trigger is chosen */}
        {showTriggerPicker && (
          <EmptyStepSlot kind="trigger" onOpenLibrary={() => openModuleLibrary(1)} />
        )}

        <ol
          aria-label="Scenario steps"
          className="space-y-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {steps.map((step, idx) => {
            const prevStep = idx > 0 ? steps[idx - 1] : undefined;
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={step.id}>
                <li>
                  {idx === 1 && showStandardAdd && (
                    <div className="mb-1">
                      <StepConnector />
                      <AddStepButton insertAtPosition={2} onClick={openModuleLibrary} />
                      <StepConnector />
                    </div>
                  )}
                  <div
                    draggable={step.position !== 1}
                    onDragStart={() => {
                      if (step.position !== 1) dragStepRef.current = step.id;
                    }}
                    onDragOver={() => {
                      if (dragStepRef.current && dragStepRef.current !== step.id) {
                        dragOverRef.current = step.id;
                      }
                    }}
                  >
                    <StepCard
                      step={step}
                      isExpanded={expandedStepId === step.id}
                      onToggleExpand={() => handleToggleExpand(step.id)}
                      onConfigChange={(config) => handleConfigChange(step.id, config)}
                      onDelete={() => handleDeleteStep(step.id)}
                      onChangeTrigger={openTriggerLibrary}
                      prevStepModuleType={prevStep?.moduleType}
                      isLifted={liftedStepId === step.id}
                      showErrors={showErrors}
                      dragHandleProps={{
                        "aria-label": `Drag to reorder step ${step.position}`,
                        onKeyDown: (e) => handleDragKeyDown(step.id, e),
                        tabIndex: step.position === 1 ? -1 : 0,
                      }}
                    />
                  </div>
                </li>

                {idx > 0 && !isLast && showStandardAdd && (
                  <li className="list-none">
                    <StepConnector />
                    <AddStepButton
                      insertAtPosition={step.position + 1}
                      onClick={openModuleLibrary}
                    />
                    <StepConnector />
                  </li>
                )}
              </React.Fragment>
            );
          })}

          {/* C.4 — Action empty slot: shown when trigger chosen but no action yet */}
          {showActionPicker && (
            <li className="list-none">
              <StepConnector />
              <EmptyStepSlot kind="action" onOpenLibrary={() => openModuleLibrary(2)} />
            </li>
          )}

          {/* Standard Add step button: shown when trigger + ≥1 action present */}
          {showStandardAdd && (
            <li className="list-none">
              <StepConnector />
              <AddStepButton
                insertAtPosition={steps.length + 1}
                onClick={openModuleLibrary}
                label="Add action step"
              />
            </li>
          )}
        </ol>

        {actionSteps.length === 0 && triggerChosen && !showActionPicker && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground" role="note">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <p>Add at least one action step to make this scenario runnable.</p>
          </div>
        )}
      </div>

      {showTestPanel && (
        <TestRunPanel
          results={testResults}
          stepModuleTypes={steps.map((s) => s.moduleType)}
          isLoading={isTesting}
          onClose={() => {
            setShowTestPanel(false);
            setTestResults([]);
          }}
        />
      )}
    </>
  );
}
