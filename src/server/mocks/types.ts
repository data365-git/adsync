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
