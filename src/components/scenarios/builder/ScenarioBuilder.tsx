"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { InfoIcon } from "lucide-react";
import { api } from "~/trpc/react";
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
  }
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

  // New scenario: all expanded by default
  const [expandedStepIds, setExpandedStepIds] = React.useState<Set<string>>(
    () => new Set(startingSteps.map((s) => s.id)),
  );

  const [showErrors, setShowErrors] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const [showTestPanel, setShowTestPanel] = React.useState(false);
  const [testResults, setTestResults] = React.useState<TestStepResult[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalInsertAt, setModalInsertAt] = React.useState(1);
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

  function openModuleLibrary(insertAt: number) {
    setModalInsertAt(insertAt);
    setModalOpen(true);
  }

  function handleSelectModule(moduleType: ModuleType, insertAt: number) {
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
    setExpandedStepIds((prev) => new Set([...prev, newStep.id]));
    setModalOpen(false);
  }

  function handleDeleteStep(stepId: string) {
    setSteps((prev) =>
      prev.filter((s) => s.id !== stepId).map((s, idx) => ({ ...s, position: idx + 1 })),
    );
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }

  function handleConfigChange(stepId: string, config: Record<string, unknown>) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, config } : s)));
  }

  function handleToggleExpand(stepId: string) {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
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
        isTriggerSlot={modalInsertAt === 1}
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
      />

      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {saveError && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <span className="mt-0.5 shrink-0" aria-hidden="true">&#x26A0;</span>
            <div>
              <p className="font-medium">Failed to save scenario</p>
              <p className="mt-0.5 text-xs">{saveError}</p>
            </div>
          </div>
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
                  {idx === 1 && (
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
                      isExpanded={expandedStepIds.has(step.id)}
                      onToggleExpand={() => handleToggleExpand(step.id)}
                      onConfigChange={(config) => handleConfigChange(step.id, config)}
                      onDelete={() => handleDeleteStep(step.id)}
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

                {idx > 0 && !isLast && (
                  <li aria-hidden="true">
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

          <li aria-hidden="true">
            <StepConnector />
            <AddStepButton
              insertAtPosition={steps.length + 1}
              onClick={openModuleLibrary}
              label="Add action step"
            />
          </li>
        </ol>

        {actionSteps.length === 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground" role="note">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <p>Add at least one action step to make this scenario runnable.</p>
          </div>
        )}

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
      </div>
    </>
  );
}
