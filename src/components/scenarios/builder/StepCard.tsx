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
import { FbListAdAccountsConfig } from "./modules/FbListAdAccountsConfig";
import { FbListAdsConfig } from "./modules/FbListAdsConfig";
import { FbGetAdConfig } from "./modules/FbGetAdConfig";
import { SheetsAppendConfig } from "./modules/SheetsAppendConfig";
import { SheetsUpsertConfig } from "./modules/SheetsUpsertConfig";
import { SheetsFindRowsConfig } from "./modules/SheetsFindRowsConfig";
import { SheetsUpdateRowConfig } from "./modules/SheetsUpdateRowConfig";
import { SheetsDeleteRowConfig } from "./modules/SheetsDeleteRowConfig";
import { SheetsGetRowConfig } from "./modules/SheetsGetRowConfig";
import { SheetsCreateTabConfig } from "./modules/SheetsCreateTabConfig";
import { BitrixCreateLeadConfig } from "./modules/BitrixCreateLeadConfig";
import { BitrixUpdateLeadConfig } from "./modules/BitrixUpdateLeadConfig";
import { BitrixFindLeadsConfig } from "./modules/BitrixFindLeadsConfig";
import { BitrixCreateDealConfig } from "./modules/BitrixCreateDealConfig";
import { BitrixUpdateDealConfig } from "./modules/BitrixUpdateDealConfig";
import { BitrixCreateSmartProcessItemConfig } from "./modules/BitrixCreateSmartProcessItemConfig";
import { getIntegrationMeta } from "~/lib/integration-icons";
import { getModule } from "~/lib/modules";
import { humanizeCronShort } from "~/lib/cron-builder";
import { MOCK_AD_ACCOUNTS } from "~/server/mocks/data";
import type { ModuleType, ScenarioStep } from "~/server/mocks/types";

/** A step that may not yet be saved to the server — scenarioId is optional */
export type DraftStep = Omit<ScenarioStep, "scenarioId"> & { scenarioId?: string };

// ─── Module config renderer props (shared interface) ─────────────────────────

interface ModuleConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepModuleType?: ModuleType;
}

// ─── MODULE_CONFIG_MAP ────────────────────────────────────────────────────────
// Maps every ModuleType to a renderer factory.
// Renderer wrapper logic is Agent C's zone — only add entries here.

type ModuleConfigRenderer = (props: ModuleConfigProps) => React.ReactNode;

const MODULE_CONFIG_MAP: Partial<Record<ModuleType, ModuleConfigRenderer>> = {
  "trigger.schedule": ({ config, onChange, errors }) => (
    <ScheduleConfig config={config} onChange={onChange} errors={errors} />
  ),
  "trigger.manual": ({ config, onChange }) => (
    <ManualConfig config={config} onChange={onChange} />
  ),
  // Legacy — same config shape as fb.ad_insights (fbAccountId/dateWindowDays/metrics)
  "fb.account_insights": ({ config, onChange, errors }) => (
    <FbAccountInsightsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "fb.campaign_insights": ({ config, onChange, errors }) => (
    <FbCampaignInsightsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "fb.ad_insights": ({ config, onChange, errors }) => (
    <FbAdInsightsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "fb.list_ad_accounts": ({ config, onChange, errors }) => (
    <FbListAdAccountsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "fb.list_ads": ({ config, onChange, errors }) => (
    <FbListAdsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "fb.get_ad": ({ config, onChange, errors }) => (
    <FbGetAdConfig config={config} onChange={onChange} errors={errors} />
  ),
  "sheets.append": ({ config, onChange, errors, prevStepModuleType }) => (
    <SheetsAppendConfig
      config={config}
      onChange={onChange}
      errors={errors}
      prevStepModuleType={prevStepModuleType}
    />
  ),
  "sheets.upsert": ({ config, onChange, errors, prevStepModuleType }) => (
    <SheetsUpsertConfig
      config={config}
      onChange={onChange}
      errors={errors}
      prevStepModuleType={prevStepModuleType}
    />
  ),
  "sheets.find_rows": ({ config, onChange, errors }) => (
    <SheetsFindRowsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "sheets.update_row": ({ config, onChange, errors, prevStepModuleType }) => (
    <SheetsUpdateRowConfig
      config={config}
      onChange={onChange}
      errors={errors}
      prevStepModuleType={prevStepModuleType}
    />
  ),
  "sheets.delete_row": ({ config, onChange, errors }) => (
    <SheetsDeleteRowConfig config={config} onChange={onChange} errors={errors} />
  ),
  "sheets.get_row": ({ config, onChange, errors }) => (
    <SheetsGetRowConfig config={config} onChange={onChange} errors={errors} />
  ),
  "sheets.create_tab": ({ config, onChange, errors }) => (
    <SheetsCreateTabConfig config={config} onChange={onChange} errors={errors} />
  ),
  "bitrix.create_lead": ({ config, onChange, errors }) => (
    <BitrixCreateLeadConfig config={config} onChange={onChange} errors={errors} />
  ),
  "bitrix.update_lead": ({ config, onChange, errors }) => (
    <BitrixUpdateLeadConfig config={config} onChange={onChange} errors={errors} />
  ),
  "bitrix.find_leads": ({ config, onChange, errors }) => (
    <BitrixFindLeadsConfig config={config} onChange={onChange} errors={errors} />
  ),
  "bitrix.create_deal": ({ config, onChange, errors }) => (
    <BitrixCreateDealConfig config={config} onChange={onChange} errors={errors} />
  ),
  "bitrix.update_deal": ({ config, onChange, errors }) => (
    <BitrixUpdateDealConfig config={config} onChange={onChange} errors={errors} />
  ),
  "bitrix.create_smart_process_item": ({ config, onChange, errors, prevStepModuleType }) => (
    <BitrixCreateSmartProcessItemConfig
      config={config}
      onChange={onChange}
      errors={errors}
      prevStepModuleType={prevStepModuleType}
    />
  ),
};

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
        errors.fbAccountId = "Select an ad account to continue — this determines which data is pulled.";
      }
      if (!config.dateWindowDays || (typeof config.dateWindowDays === "number" && config.dateWindowDays < 1)) {
        errors.dateWindowDays = "Date window must be at least 1 day — Facebook returns no rows for a zero-day pull.";
      }
      const metrics = config.metrics;
      if (!Array.isArray(metrics) || metrics.length === 0) {
        errors.metrics = "Select at least one metric — an empty pull has no columns to write to Sheets.";
      }
      break;
    }
    case "sheets.append": {
      if (!config.spreadsheetId || (typeof config.spreadsheetId === "string" && !config.spreadsheetId.trim())) {
        errors.spreadsheetId = "A spreadsheet ID is required — without it there is nowhere to write the data.";
      }
      if (!config.tabName || (typeof config.tabName === "string" && !config.tabName.trim())) {
        errors.tabName = "A tab name is required — the tab must already exist in your spreadsheet.";
      }
      const mf = config.mappedFields;
      if (!Array.isArray(mf) || mf.length === 0) {
        errors.mappedFields = "Select at least one field — otherwise the row would be written with no columns.";
      }
      break;
    }
    case "sheets.upsert": {
      if (!config.spreadsheetId || (typeof config.spreadsheetId === "string" && !config.spreadsheetId.trim())) {
        errors.spreadsheetId = "A spreadsheet ID is required — without it there is nowhere to write the data.";
      }
      if (!config.tabName || (typeof config.tabName === "string" && !config.tabName.trim())) {
        errors.tabName = "A tab name is required — the tab must already exist in your spreadsheet.";
      }
      const kf = config.keyFields;
      if (!Array.isArray(kf) || kf.length === 0) {
        errors.keyFields = "At least one key field is required.";
      }
      const mf2 = config.mappedFields;
      if (!Array.isArray(mf2) || mf2.length === 0) {
        errors.mappedFields = "Select at least one field — otherwise the row would be written with no columns.";
      }
      break;
    }
  }

  return errors;
}

export { validateStepConfig };

// ─── summarizeStep ────────────────────────────────────────────────────────────

function summarizeStep(moduleType: ModuleType, config: Record<string, unknown>): string {
  switch (moduleType) {
    case "trigger.schedule": {
      const cron = config.cronExpression;
      if (!cron || (typeof cron === "string" && !cron.trim())) return "Not configured";
      return humanizeCronShort(cron as string);
    }
    case "trigger.manual":
      return "Triggered by hand";

    case "fb.account_insights":
    case "fb.campaign_insights":
    case "fb.ad_insights": {
      const fbAccountId = typeof config.fbAccountId === "string" ? config.fbAccountId : "";
      const dateWindow = typeof config.dateWindowDays === "number" ? config.dateWindowDays : null;
      const metrics = Array.isArray(config.metrics) ? config.metrics : [];
      const metricsCount = metrics.length;

      if (!fbAccountId && dateWindow === null && metricsCount === 0) return "Not configured";

      const account = MOCK_AD_ACCOUNTS.find((a) => a.fbAccountId === fbAccountId);
      const accountName = account?.label ?? (fbAccountId || "No account");
      const windowStr = dateWindow !== null ? `last ${dateWindow} days` : "no window";
      const metricsStr = `${metricsCount} metric${metricsCount !== 1 ? "s" : ""}`;

      let summary = `${accountName} · ${windowStr} · ${metricsStr}`;

      if (
        (moduleType === "fb.campaign_insights" || moduleType === "fb.ad_insights") &&
        typeof config.campaignFilter === "string" &&
        config.campaignFilter.trim()
      ) {
        summary += " · Campaign filter set";
      }

      return summary;
    }

    case "sheets.append": {
      const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
      const tabName = typeof config.tabName === "string" ? config.tabName : null;
      const mappedFields = Array.isArray(config.mappedFields) ? config.mappedFields : [];
      const fieldCount = mappedFields.length;
      if (!spreadsheetId && !tabName) return "Not configured";
      return `${spreadsheetId ? "My Tracker" : "—"} / ${tabName ?? "—"} · ${fieldCount} field${fieldCount !== 1 ? "s" : ""}`;
    }

    case "sheets.upsert": {
      const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
      const tabName = typeof config.tabName === "string" ? config.tabName : null;
      const mappedFields = Array.isArray(config.mappedFields) ? config.mappedFields : [];
      const keyFields = Array.isArray(config.keyFields) ? (config.keyFields as string[]) : [];
      const fieldCount = mappedFields.length;
      if (!spreadsheetId && !tabName) return "Not configured";
      const keyStr = keyFields.length > 0 ? keyFields.join("+") : "—";
      return `${spreadsheetId ? "My Tracker" : "—"} / ${tabName ?? "—"} · ${fieldCount} field${fieldCount !== 1 ? "s" : ""} · key: ${keyStr}`;
    }

    default:
      return "Not configured";
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type StepStatus = "ready" | "needs-config" | "empty";

function getStepStatus(
  moduleType: ModuleType,
  config: Record<string, unknown>,
): StepStatus {
  if (moduleType === "trigger.manual") return "ready";

  // Check if anything is configured at all
  const hasAnyConfig = Object.values(config).some((v) => {
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  if (!hasAnyConfig) return "empty";

  const errors = validateStepConfig(moduleType, config);
  if (Object.keys(errors).length > 0) return "needs-config";

  return "ready";
}

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
  const { Icon, tileBg, iconColor } = getIntegrationMeta(step.moduleType);
  const mod = getModule(step.moduleType);
  const summary = summarizeStep(step.moduleType, step.config);
  const status = getStepStatus(step.moduleType, step.config);

  // ── Drag handle — hidden (display:none) for position 1
  const dragHandle = isTrigger ? null : (
    <button
      type="button"
      aria-label={dragHandleProps?.["aria-label"] ?? `Drag to reorder step ${step.position}`}
      onKeyDown={dragHandleProps?.onKeyDown}
      tabIndex={dragHandleProps?.tabIndex ?? 0}
      className="rounded-md p-1.5 touch-none cursor-grab active:cursor-grabbing hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GripVerticalIcon className="size-4 text-muted-foreground" />
    </button>
  );

  function renderConfig() {
    const renderer = MODULE_CONFIG_MAP[step.moduleType];
    if (!renderer) return null;
    return renderer({
      config: step.config,
      onChange: onConfigChange,
      errors: showErrors ? errors : undefined,
      prevStepModuleType,
    });
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
        summary={summary}
        status={status}
        BrandIcon={Icon}
        tileBg={tileBg}
        iconColor={iconColor}
        moduleName={mod?.name ?? step.moduleType}
        moduleDescription={mod?.description ?? ""}
      >
        {renderConfig()}
      </ModuleConfigShell>
    </div>
  );
}
