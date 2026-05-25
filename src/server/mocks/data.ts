import type {
  OAuthConnection,
  Run,
  RunLog,
  RunStatus,
  RunTrigger,
  Scenario,
  User,
} from "./types";

const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function relative(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

export const MOCK_USER: User = {
  id: "user_01",
  email: "jumanovsamandar005@gmail.com",
  name: "Samandar",
  image: null,
  allowlisted: true,
  timezone: "Asia/Tashkent",
  theme: "system",
  createdAt: relative(-90 * DAY),
};

export const MOCK_CONNECTIONS: OAuthConnection[] = [
  {
    id: "oauth_google_01",
    userId: MOCK_USER.id,
    provider: "google",
    status: "connected",
    email: "jumanovsamandar005@gmail.com",
    expiresAt: relative(2 * DAY),
    connectedAt: relative(-30 * DAY),
    lastVerifiedAt: relative(-2 * HOUR),
  },
  {
    id: "conn_bitrix_01",
    userId: MOCK_USER.id,
    provider: "bitrix",
    status: "disconnected",
    email: null,
    expiresAt: null,
    connectedAt: new Date("2025-05-11T00:00:00Z"),
    lastVerifiedAt: null,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Scenarios — Sheets + Bitrix only (no Facebook)
// ──────────────────────────────────────────────────────────────────────────────

export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "scn_custom_01",
    userId: MOCK_USER.id,
    name: "Watch Sheets → Create Bitrix Lead",
    kind: "CUSTOM",
    enabled: true,
    steps: [
      {
        id: "scn_custom_01_step_1",
        scenarioId: "scn_custom_01",
        position: 1,
        moduleType: "trigger.watch.sheets_new_rows",
        config: {
          spreadsheetId: "1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
          tabName: "Leads",
          watchColumn: "id",
        },
      },
      {
        id: "scn_custom_01_step_2",
        scenarioId: "scn_custom_01",
        position: 2,
        moduleType: "bitrix.create_lead",
        config: {
          title: "Lead from Sheets",
          name: "{{name}}",
          lastName: "{{lastName}}",
          phone: "{{phone}}",
          email: "{{email}}",
          sourceId: "WEB",
          comments: "",
        },
      },
    ],
    lastRunAt: relative(-6 * HOUR),
    lastRunStatus: "success",
    createdAt: relative(-21 * DAY),
    updatedAt: relative(-2 * DAY),
  },
  {
    id: "scn_custom_02",
    userId: MOCK_USER.id,
    name: "Daily Sheets find → Bitrix update",
    kind: "CUSTOM",
    enabled: true,
    steps: [
      {
        id: "scn_custom_02_step_1",
        scenarioId: "scn_custom_02",
        position: 1,
        moduleType: "trigger.schedule",
        config: { cronExpression: "0 8 * * 1", timezone: "Asia/Tashkent" },
      },
      {
        id: "scn_custom_02_step_2",
        scenarioId: "scn_custom_02",
        position: 2,
        moduleType: "sheets.find_rows",
        config: {
          spreadsheetId: "1xY9vZ3kP7nR2qL5mT8uH3bC6dF4eG0hJsK7wN2oQ8pW",
          tabName: "Contacts",
          searchColumn: "status",
          searchValue: "pending",
        },
      },
      {
        id: "scn_custom_02_step_3",
        scenarioId: "scn_custom_02",
        position: 3,
        moduleType: "bitrix.update_lead",
        config: {
          leadId: "{{leadId}}",
          statusId: "IN_PROCESS",
          comments: "Processed from Sheets automation",
        },
      },
    ],
    lastRunAt: relative(-4 * (12 * HOUR) - 4 * 30 * MINUTE),
    lastRunStatus: "success",
    createdAt: relative(-14 * DAY),
    updatedAt: relative(-1 * DAY),
  },
  {
    id: "scn_custom_03",
    userId: MOCK_USER.id,
    name: "Manual Sheets upsert",
    kind: "CUSTOM",
    enabled: false,
    steps: [
      {
        id: "scn_custom_03_step_1",
        scenarioId: "scn_custom_03",
        position: 1,
        moduleType: "trigger.manual",
        config: {},
      },
      {
        id: "scn_custom_03_step_2",
        scenarioId: "scn_custom_03",
        position: 2,
        moduleType: "sheets.upsert",
        config: {
          spreadsheetId: "1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
          tabName: "SyncedLeads",
          keyFields: ["id"],
          mappedFields: { id: "", name: "", email: "" },
        },
      },
    ],
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: relative(-5 * DAY),
    updatedAt: relative(-5 * DAY),
  },
];

function pickStatus(idx: number, total: number): RunStatus {
  if (idx === total - 1) return "queued";
  if (idx === total - 2) return "running";
  if (idx % 4 === 1) return "failed";
  return "success";
}

const SHEETS_ERROR_MESSAGES = [
  "Sheets API quota exceeded: 60 requests/min. Backoff 30s, then retry.",
  "Spreadsheet not found: ID returned 404. Check the spreadsheet ID.",
  "Bitrix24 connection error: webhook URL did not respond.",
  "Network timeout reading sheet rows after 30s.",
  "Permission denied: the connected Google account cannot access this spreadsheet.",
  "Bitrix24 lead creation failed: required field missing.",
  "Rate limit exceeded on Bitrix24 REST API.",
  "Sheet tab not found: check the tab name.",
];

function scenarioIdForRun(i: number): string {
  if (i % 3 === 0) return "scn_custom_01";
  if (i % 3 === 1) return "scn_custom_02";
  return "scn_custom_03";
}

function buildRuns(): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < 30; i++) {
    const status = pickStatus(i, 30);
    const trigger: RunTrigger = i % 3 === 0 ? "manual" : "scheduled";
    const startedOffset = -i * (12 * HOUR) - i * 30 * MINUTE;
    const startedAt = relative(startedOffset);
    const durationMs =
      status === "queued"
        ? null
        : status === "running"
          ? null
          : 800 + Math.floor((i * 7919) % 44200);
    const finishedAt =
      durationMs !== null ? new Date(startedAt.getTime() + durationMs) : null;
    const scenarioId = scenarioIdForRun(i);
    const matchedScenario = MOCK_SCENARIOS.find((s) => s.id === scenarioId);
    runs.push({
      id: `run_${String(i + 1).padStart(3, "0")}`,
      userId: MOCK_USER.id,
      adAccountId: "",
      scenarioId,
      trigger,
      status,
      startedAt,
      finishedAt,
      campaignRowsWritten: null,
      adRowsWritten: null,
      durationMs,
      errorMessage:
        status === "failed"
          ? (SHEETS_ERROR_MESSAGES[i % SHEETS_ERROR_MESSAGES.length] ?? null)
          : null,
      sheetsUrl:
        status === "success"
          ? "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV"
          : null,
      scenarioName: matchedScenario?.name ?? null,
      scenarioKind: matchedScenario?.kind ?? null,
      adAccountLabel: null,
      adAccountFbId: null,
    });
  }
  return runs;
}

export const MOCK_RUNS: Run[] = buildRuns();

const failedRuns = MOCK_RUNS.filter((r) => r.status === "failed");

const LOG_BREADCRUMBS = [
  "Starting sync.",
  "Fetching Sheets rows.",
  "Resolved tab and columns.",
  "Processing row batch.",
  "Sending to Bitrix24.",
];

function buildLogs(): RunLog[] {
  const logs: RunLog[] = [];
  let counter = 1;
  for (const run of failedRuns) {
    const breadcrumbCount = 4 + ((counter * 3) % 2);
    const start = run.startedAt.getTime();
    for (let j = 0; j < breadcrumbCount; j++) {
      const msg = LOG_BREADCRUMBS[j % LOG_BREADCRUMBS.length] ?? "Working...";
      logs.push({
        id: `log_${String(counter).padStart(3, "0")}`,
        runId: run.id,
        level: "INFO",
        message: msg,
        meta: j === 2 ? { rowsFound: 14 } : null,
        timestamp: new Date(start + j * 800),
      });
      counter++;
    }
    logs.push({
      id: `log_${String(counter).padStart(3, "0")}`,
      runId: run.id,
      level: "ERROR",
      message: run.errorMessage ?? "Unknown error.",
      meta: {
        retries: counter % 4,
      },
      timestamp: new Date(start + breadcrumbCount * 800 + 500),
    });
    counter++;
  }
  return logs;
}

export const MOCK_RUN_LOGS: RunLog[] = buildLogs();
