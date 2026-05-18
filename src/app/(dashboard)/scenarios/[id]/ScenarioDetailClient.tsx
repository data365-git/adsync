"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, RotateCcwIcon } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ScenarioDetailSkeleton } from "./ScenarioDetailSkeleton";
import type { Scenario } from "~/server/mocks/types";

interface ScenarioDetailClientProps {
  id: string;
}

export function ScenarioDetailClient({ id }: ScenarioDetailClientProps) {
  const router = useRouter();

  const {
    data: scenario,
    isPending,
    isError,
    error,
    refetch,
  } = api.scenarios.getById.useQuery({ id });

  // Fetch real runs for this scenario from the DB
  const runsQuery = api.runs.list.useQuery({ scenarioIds: [id], page: 1, pageSize: 50 });
  const scenarioRuns = React.useMemo(
    () => runsQuery.data?.runs ?? [],
    [runsQuery.data],
  );

  // Loading state — render the skeleton in-component so we cover the gap
  // between the route's loading.tsx boundary unmounting (post-hydration) and
  // the artificial 600ms tRPC delay landing. Without this guard there is a
  // ~1.5s white flash.
  if (isPending) {
    return <ScenarioDetailSkeleton />;
  }

  // Error state with retry + back navigation
  if (isError || !scenario) {
    const msg = error instanceof Error ? error.message : "Scenario not found.";
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="size-6 text-destructive" />
        </div>
        <p className="text-sm font-semibold">Failed to load scenario</p>
        <p className="mt-1 text-xs text-muted-foreground">{msg}</p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            <RotateCcwIcon />
            Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/scenarios")}
          >
            Back to scenarios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScenarioBuilderWithTabs
      scenario={scenario}
      scenarioRuns={scenarioRuns}
    />
  );
}

// ─── Sub-component that wires builder + tabs ──────────────────────────────────

import { useQueryState } from "nuqs";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import {
  BuilderHeader,
  BUILDER_HEADER_HEIGHT_PX,
} from "~/components/scenarios/builder/BuilderHeader";
import { preserveCompatibleTriggerConfig } from "~/components/scenarios/builder/ScenarioBuilder";
import { StepCard, validateStepConfig, type DraftStep } from "~/components/scenarios/builder/StepCard";
import { StepConnector } from "~/components/scenarios/builder/StepConnector";
import { AddStepButton } from "~/components/scenarios/builder/AddStepButton";
import { ModuleLibraryModal } from "~/components/scenarios/builder/ModuleLibraryModal";
import { StepConfigModal } from "~/components/scenarios/builder/StepConfigModal";
import { toast } from "sonner";
import { TestRunPanel } from "~/components/scenarios/builder/TestRunPanel";
import { UnsavedChangesGuard } from "~/components/scenarios/builder/UnsavedChangesGuard";
import { RunsTab } from "~/components/scenarios/builder/RunsTab";
import { SettingsTab } from "~/components/scenarios/builder/SettingsTab";
import { InfoIcon } from "lucide-react";
import type { Run, ModuleType } from "~/server/mocks/types";

type TestStepResult = {
  stepId: string;
  status: "success" | "failed";
  output: Record<string, unknown>;
  durationMs: number;
};

let stepCounter = 0;
function newStepId() {
  stepCounter += 1;
  return `draft_step_${Date.now()}_${stepCounter}`;
}

function defaultConfigFor(moduleType: ModuleType): Record<string, unknown> {
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
      // config form components in Stage 1'.
      return {};
  }
}

function computeMissingTooltip(steps: DraftStep[]): string | null {
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

interface ScenarioBuilderWithTabsProps {
  scenario: Scenario;
  scenarioRuns: Run[];
}

function ScenarioBuilderWithTabs({ scenario, scenarioRuns }: ScenarioBuilderWithTabsProps) {
  const router = useRouter();
  const [tab, setTab] = useQueryState("tab", { defaultValue: "builder" });

  const [name, setName] = React.useState(scenario.name);
  const [enabled, setEnabled] = React.useState(scenario.enabled);
  const [steps, setSteps] = React.useState<DraftStep[]>(() =>
    scenario.steps.map((s) => ({
      id: s.id,
      position: s.position,
      moduleType: s.moduleType,
      config: s.config,
    })),
  );

  // C.3: First step expanded by default (single-expand model)
  const [expandedStepId, setExpandedStepId] = React.useState<string | null>(
    steps.length > 0 ? (steps[0]?.id ?? null) : null,
  );

  const [showErrors, setShowErrors] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const [showTestPanel, setShowTestPanel] = React.useState(false);
  const [testResults, setTestResults] = React.useState<TestStepResult[]>([]);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [isAutosaving, setIsAutosaving] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalInsertAt, setModalInsertAt] = React.useState(2);
  const [modalMode, setModalMode] = React.useState<"insert" | "replace-trigger">(
    "insert",
  );
  const [liftedStepId, setLiftedStepId] = React.useState<string | null>(null);

  const updateMutation = api.scenarios.update.useMutation();
  const testRunMutation = api.scenarios.testRun.useMutation();

  const isSaving = updateMutation.isPending;
  const isTesting = testRunMutation.isPending;

  // The "last persisted" baseline. `scenario` (from useQuery) is the
  // initial server fetch and doesn't change after save — so comparing isDirty
  // against it leaves isDirty=true forever after the first edit+save and
  // re-triggers the "Discard unsaved changes?" dialog incorrectly. Comparing
  // against this snapshot (updated after every successful save) fixes that.
  type BaselineStep = { moduleType: ModuleType; config: Record<string, unknown> };
  const [savedBaseline, setSavedBaseline] = React.useState<{
    name: string;
    enabled: boolean;
    steps: BaselineStep[];
  }>(() => ({
    name: scenario.name,
    enabled: scenario.enabled,
    steps: scenario.steps.map((s) => ({
      moduleType: s.moduleType,
      config: s.config,
    })),
  }));

  const isDirty = React.useMemo(() => {
    if (name !== savedBaseline.name) return true;
    if (enabled !== savedBaseline.enabled) return true;
    if (steps.length !== savedBaseline.steps.length) return true;
    for (let i = 0; i < steps.length; i++) {
      const a = steps[i]!;
      const b = savedBaseline.steps[i]!;
      if (a.moduleType !== b.moduleType) return true;
      if (JSON.stringify(a.config) !== JSON.stringify(b.config)) return true;
    }
    return false;
  }, [name, enabled, steps, savedBaseline]);

  const missingFieldsTooltip = computeMissingTooltip(steps);
  const actionSteps = steps.slice(1);

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
      // Auto-expand the trigger so the new config is immediately visible.
      const triggerStep = steps.find((s) => s.position === 1);
      if (triggerStep) setExpandedStepId(triggerStep.id);
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
    // C.3: single-expand — open new step
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
    // Single-expand model
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

  function buildStepsPayload() {
    return steps.map((s) => ({
      id: s.id.startsWith("draft_") ? undefined : s.id,
      position: s.position,
      moduleType: s.moduleType,
      config: s.config,
    }));
  }

  async function handleSave() {
    setShowErrors(true);
    if (missingFieldsTooltip) return;
    setSaveError(null);
    try {
      await updateMutation.mutateAsync({
        id: scenario.id,
        data: { name, enabled, steps: buildStepsPayload() },
      });
      // Snapshot what we just persisted so isDirty returns to false and the
      // discard-changes guard doesn't fire on the next navigation attempt.
      setSavedBaseline({
        name,
        enabled,
        steps: steps.map((s) => ({ moduleType: s.moduleType, config: s.config })),
      });
      setLastSavedAt(new Date());
      toast.success("Scenario saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setSaveError(msg);
      toast.error("Failed to save scenario");
    }
  }

  // Autosave: 1.5s after the user stops editing, push to the server. Skipped
  // when there are missing required fields (we don't want autosave forcing the
  // "needs config" badges on — that's reserved for explicit Save attempts).
  React.useEffect(() => {
    if (!isDirty) return;
    if (missingFieldsTooltip) return;
    const handle = setTimeout(() => {
      void (async () => {
        setIsAutosaving(true);
        try {
          await updateMutation.mutateAsync({
            id: scenario.id,
            data: { name, enabled, steps: buildStepsPayload() },
          });
          // Roll the baseline forward so isDirty becomes false — keeps the
          // discard dialog from firing on every navigation post-autosave.
          setSavedBaseline({
        name,
        enabled,
        steps: steps.map((s) => ({ moduleType: s.moduleType, config: s.config })),
      });
          setLastSavedAt(new Date());
          // Brief, low-key toast — proves to the user that autosave fired.
          // Short duration (1.2s) keeps it out of the way during rapid editing.
          toast.success("Saved", { duration: 1200 });
        } catch {
          // Autosave failures are silent here — manual Save surfaces them via saveError.
        } finally {
          setIsAutosaving(false);
        }
      })();
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, missingFieldsTooltip, name, enabled, steps]);

  async function handleTest() {
    setShowTestPanel(true);
    setTestResults([]);
    try {
      const results = await testRunMutation.mutateAsync({ id: scenario.id });
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

  const builderContent = (
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

              {idx > 0 && !isLast && (
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

        <li className="list-none">
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
    </div>
  );

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
        scenarioId={scenario.id}
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

      {/* Builder header — fixed-positioned, so reserve space below via the spacer */}
      <BuilderHeader
        name={name}
        enabled={enabled}
        isSaving={isSaving}
        isAutosaving={isAutosaving}
        lastSavedAt={lastSavedAt}
        isTesting={isTesting}
        isDirty={isDirty}
        missingFieldsTooltip={showErrors ? missingFieldsTooltip : null}
        onNameChange={setName}
        onEnabledToggle={setEnabled}
        onSave={() => void handleSave()}
        onTest={() => void handleTest()}
        onBack={handleBack}
        steps={steps}
        scenarioId={scenario.id}
        scenarioRuns={scenarioRuns}
      />
      {/* Spacer to push content below the fixed header */}
      <div style={{ height: BUILDER_HEADER_HEIGHT_PX }} aria-hidden />

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(val) => {
          if (val !== null) {
            const result = setTab(val as string);
            if (result instanceof Promise) void result;
          }
        }}
        className="flex-1"
      >
        <div className="border-b border-border px-4">
          <TabsList variant="line" className="h-10">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="runs">Run History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="builder" className="mt-0">
          {builderContent}
        </TabsContent>

        <TabsContent value="runs" className="mt-0 px-4 py-6">
          <RunsTab runs={scenarioRuns} scenarioId={scenario.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 px-4 py-6">
          <div className="mx-auto max-w-lg">
            <SettingsTab
              scenarioId={scenario.id}
              currentName={name}
              onNameChange={setName}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* C.5: Sliding bottom dock — rendered outside tabs so it overlays everything */}
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
