"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { InfoIcon, ClockIcon, ZapIcon } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { getModule } from "~/lib/modules";
import { getIntegrationMeta } from "~/lib/integration-icons";
import type { ModuleType } from "~/server/mocks/types";
import { BuilderHeader } from "./BuilderHeader";
import { StepCard, validateStepConfig, type DraftStep } from "./StepCard";
import { StepConnector } from "./StepConnector";
import { AddStepButton } from "./AddStepButton";
import { ModuleLibraryModal } from "./ModuleLibraryModal";
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
    case "fb.account_insights":
    case "fb.campaign_insights":
    case "fb.ad_insights":
      return { fbAccountId: "", dateWindowDays: 7, metrics: [] };
    case "sheets.append":
      return { spreadsheetId: "", tabName: "", mappedFields: [] };
    case "sheets.upsert":
      return { spreadsheetId: "", tabName: "", keyFields: [], mappedFields: [] };
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

// ─── TriggerPickerCards ───────────────────────────────────────────────────────
// Shown when steps.length === 1 and step[0] has no configured moduleType set.
// We always have trigger.manual as default, so we show the picker to let the
// user explicitly choose between Schedule and Manual.

interface TriggerPickerProps {
  onPick: (moduleType: "trigger.schedule" | "trigger.manual") => void;
}

function TriggerPickerCards({ onPick }: TriggerPickerProps) {
  const TRIGGER_OPTIONS: Array<{
    moduleType: "trigger.schedule" | "trigger.manual";
    icon: React.ReactNode;
    title: string;
    description: string;
  }> = [
    {
      moduleType: "trigger.schedule",
      icon: <ClockIcon className="size-5" />,
      title: "Schedule",
      description: "Run on a recurring schedule.",
    },
    {
      moduleType: "trigger.manual",
      icon: <ZapIcon className="size-5" />,
      title: "Manual",
      description: "Trigger by hand when you click.",
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5">
      <p className="mb-3 text-sm font-medium text-foreground">
        Step 1: When this happens…
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        {TRIGGER_OPTIONS.map((opt) => {
          const meta = getIntegrationMeta(opt.moduleType);
          return (
            <button
              key={opt.moduleType}
              type="button"
              onClick={() => onPick(opt.moduleType)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all",
                "hover:border-primary/40 hover:bg-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  meta.tileBg,
                  meta.iconColor,
                )}
                aria-hidden="true"
              >
                {opt.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold">{opt.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {opt.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Pick a trigger to start your scenario.
      </p>
    </div>
  );
}

// ─── ActionPickerCards ────────────────────────────────────────────────────────
// Shown when trigger is set and steps.length === 1 (no action yet added).

const ACTION_GROUPS: Array<{
  label: string;
  moduleType: "fb.account_insights" | "fb.campaign_insights" | "fb.ad_insights" | "sheets.append" | "sheets.upsert";
  groupIcon: React.ReactNode;
}[]> = [
  [
    { label: "Get Account Insights", moduleType: "fb.account_insights", groupIcon: null },
    { label: "Get Campaign Insights", moduleType: "fb.campaign_insights", groupIcon: null },
    { label: "Get Ad Insights", moduleType: "fb.ad_insights", groupIcon: null },
  ],
  [
    { label: "Append Rows", moduleType: "sheets.append", groupIcon: null },
    { label: "Upsert Rows", moduleType: "sheets.upsert", groupIcon: null },
  ],
];

const ACTION_GROUP_LABELS = ["Facebook Ads", "Google Sheets"];

interface ActionPickerProps {
  onPick: (moduleType: ModuleType) => void;
}

function ActionPickerCards({ onPick }: ActionPickerProps) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5">
      <p className="mb-3 text-sm font-medium text-foreground">
        Step 2: Then do this…
      </p>
      <div className="space-y-3">
        {ACTION_GROUPS.map((group, gi) => {
          // Use the first item's moduleType to get integration meta for the group header
          const firstItem = group[0];
          const headerMeta = firstItem ? getIntegrationMeta(firstItem.moduleType) : null;
          return (
            <div key={gi} className="rounded-xl border border-border bg-card p-3">
              {/* Group header */}
              <div className="mb-2 flex items-center gap-2">
                {headerMeta && (
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md",
                      headerMeta.tileBg,
                    )}
                    aria-hidden="true"
                  >
                    <headerMeta.Icon className={cn("size-3.5", headerMeta.iconColor)} />
                  </span>
                )}
                <span className="text-xs font-semibold text-foreground">
                  {ACTION_GROUP_LABELS[gi]}
                </span>
              </div>
              {/* Module list */}
              <div className="flex flex-wrap gap-2">
                {group.map((item) => (
                  <button
                    key={item.moduleType}
                    type="button"
                    onClick={() => onPick(item.moduleType)}
                    className={cn(
                      "rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium",
                      "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "transition-colors",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScenarioBuilderProps {
  /** Pre-populated name (from template) */
  initialName?: string;
  /** Pre-populated steps (from template) */
  initialSteps?: DraftStep[];
}

// ─── New-scenario builder (no tabs) ──────────────────────────────────────────

export function ScenarioBuilder({
  initialName,
  initialSteps,
}: ScenarioBuilderProps) {
  const router = useRouter();

  const startingSteps: DraftStep[] = React.useMemo(() => {
    if (initialSteps && initialSteps.length > 0) return initialSteps;
    return [
      {
        id: newStepId(),
        position: 1,
        moduleType: "trigger.manual",
        config: {},
      },
    ];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [name, setName] = React.useState(initialName ?? "Untitled scenario");
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

  function handlePickTrigger(moduleType: "trigger.schedule" | "trigger.manual") {
    setSteps((prev) =>
      prev.map((s) =>
        s.position === 1
          ? {
              ...s,
              moduleType,
              config: defaultConfigFor(moduleType),
            }
          : s,
      ),
    );
    setTriggerChosen(true);
    // Expand the trigger step so config is immediately visible
    const triggerId = steps[0]?.id ?? null;
    setExpandedStepId(triggerId);
  }

  function handlePickAction(moduleType: ModuleType) {
    const newStep: DraftStep = {
      id: newStepId(),
      position: 2,
      moduleType,
      config: defaultConfigFor(moduleType),
    };
    setSteps((prev) => [
      ...prev,
      { ...newStep, position: prev.length + 1 },
    ]);
    // Expand the new action step (single-expand)
    setExpandedStepId(newStep.id);
  }

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
    if (modalMode === "replace-trigger") {
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
    try {
      const result = await createMutation.mutateAsync({
        name,
        enabled,
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
    setShowTestPanel(true);
    setTestResults([]);
    try {
      // Use a known scenario id for the mock test run
      const results = await testRunMutation.mutateAsync({ id: "scn_custom_01" });
      setTestResults(results);
    } catch {
      setTestResults([]);
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

      <BuilderHeader
        name={name}
        enabled={enabled}
        isSaving={isSaving}
        isTesting={isTesting}
        isDirty={isDirty}
        missingFieldsTooltip={showErrors ? missingFieldsTooltip : null}
        onNameChange={setName}
        onEnabledToggle={setEnabled}
        onSave={() => void handleSave()}
        onTest={() => void handleTest()}
        onBack={handleBack}
        steps={steps}
      />

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

        {/* C.4 — Trigger picker: shown before trigger is chosen */}
        {showTriggerPicker && (
          <TriggerPickerCards onPick={handlePickTrigger} />
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

          {/* C.4 — Action picker: shown when trigger chosen but no action yet */}
          {showActionPicker && (
            <li className="list-none">
              <StepConnector />
              <ActionPickerCards onPick={handlePickAction} />
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
