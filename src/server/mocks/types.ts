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
  provider: "google" | "facebook";
  status: "connected" | "expired" | "disconnected";
  email: string | null;
  expiresAt: Date | null;
  connectedAt: Date | null;
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
  | "fb.account_insights"
  | "fb.campaign_insights"
  | "fb.ad_insights"
  | "sheets.append"
  | "sheets.upsert";

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
  steps: ScenarioStep[];
  lastRunAt: Date | null;
  lastRunStatus: "success" | "failed" | null;
  createdAt: Date;
  updatedAt: Date;
};
