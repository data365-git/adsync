export type User = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  allowlisted: boolean;
  timezone: string;
  theme: "light" | "dark" | "system";
  createdAt: Date;
};

export type OAuthConnection = {
  id: string;
  userId: string;
  provider: "google" | "facebook" | "bitrix";
  status: "connected" | "expired" | "disconnected";
  email: string | null;
  expiresAt: Date | null;
  connectedAt: Date | null;
  lastVerifiedAt: Date | null;
};

export type AdAccount = {
  id: string;
  userId: string;
  label: string;
  fbAccountId: string;
  enabled: boolean;
  levels: ("CAMPAIGN" | "AD")[];
  metrics: string[];
  dateWindowDays: number;
  spreadsheetId: string;
  campaignTabName: string;
  adTabName: string;
  cronExpression: string;
  timezone: string;
  lastRunAt: Date | null;
  lastRunStatus: "success" | "failed" | null;
  createdAt: Date;
};

export type RunStatus = "queued" | "running" | "success" | "failed";
export type RunTrigger = "manual" | "scheduled";

export type Run = {
  id: string;
  userId: string;
  adAccountId: string;
  scenarioId: string;
  trigger: RunTrigger;
  status: RunStatus;
  startedAt: Date;
  finishedAt: Date | null;
  campaignRowsWritten: number | null;
  adRowsWritten: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  sheetsUrl: string | null;
  /** Enriched by the runs router — null when scenario not found */
  scenarioName: string | null;
  scenarioKind: "QUICK_SETUP" | "CUSTOM" | null;
  /** Enriched by the runs router — null when no ad account linked */
  adAccountLabel: string | null;
  adAccountFbId: string | null;
};

export type RunLog = {
  id: string;
  runId: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  meta: Record<string, unknown> | null;
  timestamp: Date;
};

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1.5 — Scenarios (Zapier-linear builder)
// ──────────────────────────────────────────────────────────────────────────────

export type ScenarioKind = "QUICK_SETUP" | "CUSTOM";

export type ModuleType =
  | "trigger.schedule"
  | "trigger.manual"
  | "trigger.webhook"
  | "trigger.watch.sheets_new_rows"
  | "trigger.watch.bitrix_new_lead"
  | "sheets.append"
  | "sheets.upsert"
  | "sheets.find_rows"
  | "sheets.update_row"
  | "sheets.delete_row"
  | "sheets.get_row"
  | "sheets.create_tab"
  | "bitrix.create_lead"
  | "bitrix.update_lead"
  | "bitrix.delete_lead"
  | "bitrix.find_leads"
  | "bitrix.create_deal"
  | "bitrix.update_deal";

export type ScenarioStep = {
  id: string;
  scenarioId: string;
  position: number;
  moduleType: ModuleType;
  config: Record<string, unknown>;
};

export type Scenario = {
  id: string;
  userId: string;
  name: string;
  kind: ScenarioKind;
  enabled: boolean;
  /** null = root, undefined/absent in legacy mock data */
  folderId?: string | null;
  steps: ScenarioStep[];
  lastRunAt: Date | null;
  lastRunStatus: "success" | "failed" | null;
  createdAt: Date;
  updatedAt: Date;
};
