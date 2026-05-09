"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { ModuleConfigShell } from "./modules/ModuleConfigShell";
import { ScheduleConfig } from "./modules/ScheduleConfig";
import { ManualConfig } from "./modules/ManualConfig";
import { FbAccountInsightsConfig } from "./modules/FbAccountInsightsConfig";
import { FbCampaignInsightsConfig } from "./modules/FbCampaignInsightsConfig";
import { FbAdInsightsConfig } from "./modules/FbAdInsightsConfig";
import { SheetsAppendConfig } from "./modules/SheetsAppendConfig";
import { SheetsUpsertConfig } from "./modules/SheetsUpsertConfig";
import type { ModuleType, ScenarioStep } from "~/server/mocks/types";

/** A step that may not yet be saved to the server — scenarioId is optional */
export type DraftStep = Omit<ScenarioStep, "scenarioId"> & { scenarioId?: string };

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateStepConfig(
  moduleType: ModuleType,
  config: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (moduleType) {
    case "trigger.schedule": {
      const cron = config.cronExpression;
      const tz = config.timezone;
      if (!cron || (typeof cron === "string" && !cron.trim())) {
        errors.cronExpression = "Cron expression is required.";
      } else if (typeof cron === "string" && cron.trim().split(/\s+/).length !== 5) {
        errors.cronExpression = "Must be a valid 5-field cron expression.";
      }
      if (!tz || (typeof tz === "string" && !tz.trim())) {
        errors.timezone = "Timezone is required.";
      }
      break;
    }
    case "trigger.manual":
      // No required fields
      break;
    case "fb.account_insights":
    case "fb.campaign_insights":
    case "fb.ad_insights": {
      if (!config.fbAccountId || (typeof config.fbAccountId === "string" && !config.fbAccountId.trim())) {
        errors.fbAccountId = "Ad account is required.";
      }
      if (!config.dateWindowDays || (typeof config.dateWindowDays === "number" && config.dateWindowDays < 1)) {
        errors.dateWindowDays = "Date window must be at least 1 day.";
      }
      const metrics = config.metrics;
      if (!Array.isArray(metrics) || metrics.length === 0) {
        errors.metrics = "At least one metric is required.";
      }
      break;
    }
    case "sheets.append": {
      if (!config.spreadsheetId || (typeof config.spreadsheetId === "string" && !config.spreadsheetId.trim())) {
        errors.spreadsheetId = "Spreadsheet ID is required.";
      }
      if (!config.tabName || (typeof config.tabName === "string" && !config.tabName.trim())) {
        errors.tabName = "Tab name is required.";
      }
      const mf = config.mappedFields;
      if (!Array.isArray(mf) || mf.length === 0) {
        errors.mappedFields = "At least one field must be selected.";
      }
      break;
    }
    case "sheets.upsert": {
      if (!config.spreadsheetId || (typeof config.spreadsheetId === "string" && !config.spreadsheetId.trim())) {
        errors.spreadsheetId = "Spreadsheet ID is required.";
      }
      if (!config.tabName || (typeof config.tabName === "string" && !config.tabName.trim())) {
        errors.tabName = "Tab name is required.";
      }
      const kf = config.keyFields;
      if (!Array.isArray(kf) || kf.length === 0) {
        errors.keyFields = "At least one key field is required.";
      }
      const mf2 = config.mappedFields;
      if (!Array.isArray(mf2) || mf2.length === 0) {
        errors.mappedFields = "At least one field must be selected.";
      }
      break;
    }
  }

  return errors;
}

export { validateStepConfig };

// ─── Props ────────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: DraftStep;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onConfigChange: (config: Record<string, unknown>) => void;
  onDelete: () => void;
  /**
   * For position-1 trigger steps only — opens the module library filtered to
   * triggers so the user can swap one trigger module for another.
   */
  onChangeTrigger?: () => void;
  /** Module type of the step directly before this one (for FieldMappingPicker) */
  prevStepModuleType?: ModuleType;
  /** Drag state */
  isDragging?: boolean;
  isLifted?: boolean;
  dragHandleProps?: {
    "aria-label": string;
    onKeyDown: (e: React.KeyboardEvent) => void;
    tabIndex: number;
  };
  showErrors?: boolean;
}

export function StepCard({
  step,
  isExpanded,
  onToggleExpand,
  onConfigChange,
  onDelete,
  onChangeTrigger,
  prevStepModuleType,
  isDragging,
  isLifted,
  dragHandleProps,
  showErrors,
}: StepCardProps) {
  const isTrigger = step.position === 1;
  const errors = showErrors ? validateStepConfig(step.moduleType, step.config) : {};
  const hasError = Object.keys(errors).length > 0;

  const dragHandle = (
    <button
      type="button"
      aria-label={dragHandleProps?.["aria-label"] ?? `Drag to reorder step ${step.position}`}
      onKeyDown={dragHandleProps?.onKeyDown}
      tabIndex={isTrigger ? -1 : (dragHandleProps?.tabIndex ?? 0)}
      disabled={isTrigger}
      className={cn(
        "rounded-md p-1.5 touch-none",
        isTrigger
          ? "cursor-default opacity-30"
          : "cursor-grab active:cursor-grabbing hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-disabled={isTrigger}
    >
      <GripVerticalIcon className="size-4 text-muted-foreground" />
    </button>
  );

  function renderConfig() {
    switch (step.moduleType) {
      case "trigger.schedule":
        return (
          <ScheduleConfig
            config={step.config}
            onChange={onConfigChange}
            errors={showErrors ? errors : undefined}
          />
        );
      case "trigger.manual":
        return (
          <ManualConfig
            config={step.config}
            onChange={onConfigChange}
          />
        );
      case "fb.account_insights":
        return (
          <FbAccountInsightsConfig
            config={step.config}
            onChange={onConfigChange}
            errors={showErrors ? errors : undefined}
          />
        );
      case "fb.campaign_insights":
        return (
          <FbCampaignInsightsConfig
            config={step.config}
            onChange={onConfigChange}
            errors={showErrors ? errors : undefined}
          />
        );
      case "fb.ad_insights":
        return (
          <FbAdInsightsConfig
            config={step.config}
            onChange={onConfigChange}
            errors={showErrors ? errors : undefined}
          />
        );
      case "sheets.append":
        return (
          <SheetsAppendConfig
            config={step.config}
            onChange={onConfigChange}
            errors={showErrors ? errors : undefined}
            prevStepModuleType={prevStepModuleType}
          />
        );
      case "sheets.upsert":
        return (
          <SheetsUpsertConfig
            config={step.config}
            onChange={onConfigChange}
            errors={showErrors ? errors : undefined}
            prevStepModuleType={prevStepModuleType}
          />
        );
    }
  }

  return (
    <div
      className={cn(
        "transition-all",
        isDragging && "opacity-50",
        isLifted && "scale-[1.02] shadow-lg",
      )}
    >
      <ModuleConfigShell
        moduleType={step.moduleType}
        position={step.position}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onDelete={isTrigger ? undefined : onDelete}
        isDeleteDisabled={isTrigger}
        onChangeTrigger={isTrigger ? onChangeTrigger : undefined}
        dragHandle={dragHandle}
        hasError={showErrors && hasError}
      >
        {renderConfig()}
      </ModuleConfigShell>
    </div>
  );
}
