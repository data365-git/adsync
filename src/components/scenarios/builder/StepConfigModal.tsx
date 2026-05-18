"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  MODULE_CONFIG_MAP,
  validateStepConfig,
  type DraftStep,
} from "./StepCard";
import { getIntegrationMeta } from "~/lib/integration-icons";
import { getModule } from "~/lib/modules";
import { api } from "~/trpc/react";
import type { ModuleType } from "~/server/mocks/types";
import { UpstreamValuesPanel } from "./UpstreamValuesPanel";
import { UpstreamValuesProvider } from "./UpstreamValuesContext";
import { buildUpstreamCatalog } from "./upstream-catalog";

// ─── Sample tab (lifted out of ModuleConfigShell so the modal can reuse it) ─

function SampleTab({ moduleType }: { moduleType: ModuleType }) {
  const mod = getModule(moduleType);
  const isTrigger =
    moduleType === "trigger.schedule" || moduleType === "trigger.manual";

  if (isTrigger) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          This trigger has no sample output. Add a downstream step to see its output.
        </p>
      </div>
    );
  }

  if (!mod || mod.sampleOutput.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm italic">
        No sample output available.
      </p>
    );
  }

  const firstRow = mod.sampleOutput[0] ?? {};
  const columns = Object.keys(firstRow).slice(0, 5);
  const rows = mod.sampleOutput.slice(0, 3);

  function truncate(val: unknown): string {
    if (val === null || val === undefined) return "";
    let str: string;
    if (typeof val === "string") str = val;
    else if (
      typeof val === "number" ||
      typeof val === "boolean" ||
      typeof val === "bigint"
    )
      str = val.toString();
    else str = JSON.stringify(val) ?? "";
    return str.length > 20 ? str.slice(0, 20) + "…" : str;
  }

  return (
    <div className="space-y-3">
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-muted-foreground px-3 py-2 text-left font-mono"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-border hover:bg-muted/20 border-b last:border-0"
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 font-mono">
                    {truncate(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        Preview of what this step would output. Real data will vary based on your
        configuration.
      </p>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface StepConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The step being configured. Null means closed. */
  step: DraftStep | null;
  /** Module type of the step immediately upstream — used by FieldMappingPicker etc. */
  prevStepModuleType?: ModuleType;
  steps?: DraftStep[];
  /** Update handler — same shape as inline config. */
  onConfigChange: (config: Record<string, unknown>) => void;
  /** Forwarded down to renderers so they can show required-field error states. */
  showErrors?: boolean;
}

export function StepConfigModal({
  open,
  onOpenChange,
  step,
  prevStepModuleType,
  steps = [],
  onConfigChange,
  showErrors,
}: StepConfigModalProps) {
  const [activeTab, setActiveTab] = React.useState<"configure" | "sample" | "values">(
    "configure",
  );

  React.useEffect(() => {
    if (open) setActiveTab("configure");
  }, [open]);

  const upstreamInfo = React.useMemo(() => {
    if (!step) {
      return { spreadsheetId: "", tabName: "", fallbackColumns: [] as string[] };
    }
    const currentIndex = steps.findIndex((candidate) => candidate.id === step.id);
    const previousSteps = currentIndex > 0 ? steps.slice(0, currentIndex).reverse() : [];
    const sheetsStep = previousSteps.find((candidate) => {
      const readsSheet =
        candidate.moduleType === "trigger.watch.sheets_new_rows" ||
        candidate.moduleType === "sheets.find_rows" ||
        candidate.moduleType === "sheets.get_row";
      return (
        readsSheet &&
        typeof candidate.config.spreadsheetId === "string" &&
        candidate.config.spreadsheetId.length > 0 &&
        typeof candidate.config.tabName === "string" &&
        candidate.config.tabName.length > 0
      );
    });

    if (sheetsStep) {
      return {
        spreadsheetId: sheetsStep.config.spreadsheetId as string,
        tabName: sheetsStep.config.tabName as string,
        fallbackColumns: [] as string[],
      };
    }

    const sampleStep = previousSteps.find(
      (candidate) => getModule(candidate.moduleType)?.sampleOutput[0],
    );
    const sample = sampleStep
      ? getModule(sampleStep.moduleType)?.sampleOutput[0]
      : undefined;
    return {
      spreadsheetId: "",
      tabName: "",
      fallbackColumns: sample ? Object.keys(sample) : [],
    };
  }, [step, steps]);
  const { data: sheetSample } = api.connections.listSheetSample.useQuery(
    {
      spreadsheetId: upstreamInfo.spreadsheetId,
      tabName: upstreamInfo.tabName,
      rowCount: 1,
    },
    {
      enabled:
        upstreamInfo.spreadsheetId.length > 0 && upstreamInfo.tabName.length > 0,
      staleTime: 60_000,
    },
  );
  const prevStepOutputColumns = sheetSample?.columns ?? upstreamInfo.fallbackColumns;

  if (!step) return null;

  const { Icon, tileBg, iconColor } = getIntegrationMeta(step.moduleType);
  const mod = getModule(step.moduleType);
  const displayName = mod?.name ?? step.moduleType;
  const displayDescription = mod
    ? `${mod.group} - ${mod.shortName}`
    : step.moduleType;
  const renderer = MODULE_CONFIG_MAP[step.moduleType];
  const errors = showErrors
    ? validateStepConfig(step.moduleType, step.config)
    : {};
  const isTriggerStep = step.position === 1;
  const upstreamCatalog = buildUpstreamCatalog(steps, step.position, sheetSample);
  const valuesPanel = (
    <UpstreamValuesPanel catalog={upstreamCatalog} className="max-h-[60vh]" />
  );

  return (
    <UpstreamValuesProvider>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,1120px)] max-w-none p-0 sm:max-w-none"
        showCloseButton
        aria-label={`Configure step ${step.position}`}
      >
        <DialogHeader className="border-border flex flex-row items-start gap-4 border-b px-6 py-5">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              tileBg,
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base">{displayName}</DialogTitle>
            {displayDescription && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                {displayDescription}
              </p>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="bg-muted flex gap-1 rounded-lg p-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "configure"}
              onClick={() => setActiveTab("configure")}
              className={cn(
                "focus-visible:ring-ring flex-1 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                activeTab === "configure"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Configure
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "sample"}
              onClick={() => setActiveTab("sample")}
              className={cn(
                "focus-visible:ring-ring flex-1 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                activeTab === "sample"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sample
            </button>
            {!isTriggerStep ? (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "values"}
                onClick={() => setActiveTab("values")}
                className={cn(
                  "focus-visible:ring-ring flex-1 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden",
                  activeTab === "values"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Values from previous steps
              </button>
            ) : null}
          </div>
        </div>

        {/* Body — scrolls when the form is long so the footer stays visible */}
        <div className="px-6 py-5">
          {activeTab === "values" && !isTriggerStep ? (
            <div className="max-h-[60vh] overflow-y-auto">{valuesPanel}</div>
          ) : (
            <div
              className={cn(
                "grid gap-5",
                !isTriggerStep && "lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]",
              )}
            >
              <div className="max-h-[60vh] overflow-y-auto">
          {activeTab === "configure" ? (
            renderer ? (
              renderer({
                config: step.config,
                onChange: onConfigChange,
                errors: showErrors ? errors : undefined,
                prevStepModuleType,
                prevStepOutputColumns,
              })
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No configuration form available for this module yet.
              </p>
            )
          ) : (
            <SampleTab moduleType={step.moduleType} />
          )}
              </div>
              {!isTriggerStep ? (
                <div className="hidden border-l border-border pl-5 lg:block">
                  {valuesPanel}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer — Done closes the modal. Autosave persists the config in the background. */}
        <div className="border-border bg-muted/30 flex items-center justify-between gap-3 border-t px-6 py-3 text-xs text-muted-foreground">
          <span>Changes are saved automatically.</span>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close configuration"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </UpstreamValuesProvider>
  );
}
