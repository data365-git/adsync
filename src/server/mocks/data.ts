import type {
  AdAccount,
  OAuthConnection,
  Run,
  RunLog,
  RunStatus,
  RunTrigger,
  Scenario,
  ScenarioStep,
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
  },
  {
    id: "oauth_facebook_01",
    userId: MOCK_USER.id,
    provider: "facebook",
    status: "connected",
    email: "jumanovsamandar005@gmail.com",
    expiresAt: null,
    connectedAt: relative(-45 * DAY),
  },
  {
    id: "conn_bitrix_01",
    userId: MOCK_USER.id,
    provider: "bitrix",
    status: "disconnected",
    email: null,
    expiresAt: null,
    connectedAt: new Date("2025-05-11T00:00:00Z"),
  },
];

export const MOCK_AD_ACCOUNTS: AdAccount[] = [
  {
    id: "acc_01",
    userId: MOCK_USER.id,
    label: "Brand Awareness — UZ",
    fbAccountId: "act_109283746501283",
    enabled: true,
    levels: ["CAMPAIGN", "AD"],
    metrics: [
      "impressions",
      "reach",
      "clicks",
      "ctr",
      "spend",
      "cpm",
      "cpc",
      "conversions",
    ],
    dateWindowDays: 7,
    spreadsheetId: "1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
    campaignTabName: "Campaigns",
    adTabName: "Ads",
    cronExpression: "0 6 * * *",
    timezone: "Asia/Tashkent",
    lastRunAt: relative(-6 * HOUR),
    lastRunStatus: "success",
    createdAt: relative(-60 * DAY),
  },
  {
    id: "acc_02",
    userId: MOCK_USER.id,
    label: "Performance — Retargeting",
    fbAccountId: "act_209384756102837",
    enabled: true,
    levels: ["CAMPAIGN"],
    metrics: ["impressions", "clicks", "spend", "cpc", "ctr"],
    dateWindowDays: 14,
    spreadsheetId: "1xY9vZ3kP7nR2qL5mT8uH3bC6dF4eG0hJsK7wN2oQ8pW",
    campaignTabName: "Campaigns",
    adTabName: "Ads",
    cronExpression: "0 */6 * * *",
    timezone: "Asia/Tashkent",
    lastRunAt: relative(-2 * HOUR),
    lastRunStatus: "failed",
    createdAt: relative(-45 * DAY),
  },
  {
    id: "acc_03",
    userId: MOCK_USER.id,
    label: "Creative Tests — Paused",
    fbAccountId: "act_309485762038465",
    enabled: false,
    levels: ["AD"],
    metrics: ["impressions", "spend", "video_views", "video_view_rate"],
    dateWindowDays: 3,
    spreadsheetId: "1mN2vR3kP7nL5xY9qT8uH3bC6dF4eG0hJsK7wT2oQ8pZ",
    campaignTabName: "Campaigns",
    adTabName: "Ads",
    cronExpression: "",
    timezone: "Asia/Tashkent",
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: relative(-10 * DAY),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1.5 — Scenarios
// 3 QUICK_SETUP (one mirroring each AdAccount) + 4 CUSTOM
// ──────────────────────────────────────────────────────────────────────────────

const ACC_01 = MOCK_AD_ACCOUNTS[0]!;
const ACC_02 = MOCK_AD_ACCOUNTS[1]!;
const ACC_03 = MOCK_AD_ACCOUNTS[2]!;

function quickStepsFor(account: AdAccount): ScenarioStep[] {
  const scenarioId = `scn_quick_${account.id}`;
  const triggerStep: ScenarioStep =
    account.cronExpression && account.cronExpression.trim() !== ""
      ? {
          id: `${scenarioId}_step_1`,
          scenarioId,
          position: 1,
          moduleType: "trigger.schedule",
          config: {
            cronExpression: account.cronExpression,
            timezone: account.timezone,
          },
        }
      : {
          id: `${scenarioId}_step_1`,
          scenarioId,
          position: 1,
          moduleType: "trigger.manual",
          config: {},
        };
  const fetchModule = account.levels.includes("CAMPAIGN")
    ? ("fb.campaign_insights" as const)
    : ("fb.ad_insights" as const);
  const fbStep: ScenarioStep = {
    id: `${scenarioId}_step_2`,
    scenarioId,
    position: 2,
    moduleType: fetchModule,
    config: {
      fbAccountId: account.fbAccountId,
      dateWindowDays: account.dateWindowDays,
      metrics: account.metrics,
    },
  };
  const sheetsTab = account.levels.includes("CAMPAIGN")
    ? account.campaignTabName
    : account.adTabName;
  const sheetsStep: ScenarioStep = {
    id: `${scenarioId}_step_3`,
    scenarioId,
    position: 3,
    moduleType: "sheets.upsert",
    config: {
      spreadsheetId: account.spreadsheetId,
      tabName: sheetsTab,
      keyFields: ["date", "campaign_id"],
      mappedFields: account.metrics,
    },
  };
  return [triggerStep, fbStep, sheetsStep];
}

export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: `scn_quick_${ACC_01.id}`,
    userId: MOCK_USER.id,
    name: `Quick: ${ACC_01.label}`,
    kind: "QUICK_SETUP",
    enabled: ACC_01.enabled,
    steps: quickStepsFor(ACC_01),
    lastRunAt: ACC_01.lastRunAt,
    lastRunStatus: ACC_01.lastRunStatus,
    createdAt: ACC_01.createdAt,
    updatedAt: ACC_01.createdAt,
  },
  {
    id: `scn_quick_${ACC_02.id}`,
    userId: MOCK_USER.id,
    name: `Quick: ${ACC_02.label}`,
    kind: "QUICK_SETUP",
    enabled: ACC_02.enabled,
    steps: quickStepsFor(ACC_02),
    lastRunAt: ACC_02.lastRunAt,
    lastRunStatus: ACC_02.lastRunStatus,
    createdAt: ACC_02.createdAt,
    updatedAt: ACC_02.createdAt,
  },
  {
    id: `scn_quick_${ACC_03.id}`,
    userId: MOCK_USER.id,
    name: `Quick: ${ACC_03.label}`,
    kind: "QUICK_SETUP",
    enabled: ACC_03.enabled,
    steps: quickStepsFor(ACC_03),
    lastRunAt: ACC_03.lastRunAt,
    lastRunStatus: ACC_03.lastRunStatus,
    createdAt: ACC_03.createdAt,
    updatedAt: ACC_03.createdAt,
  },
  {
    id: "scn_custom_01",
    userId: MOCK_USER.id,
    name: "Multi-account daily roundup",
    kind: "CUSTOM",
    enabled: true,
    steps: [
      {
        id: "scn_custom_01_step_1",
        scenarioId: "scn_custom_01",
        position: 1,
        moduleType: "trigger.schedule",
        config: { cronExpression: "0 7 * * *", timezone: "Asia/Tashkent" },
      },
      {
        id: "scn_custom_01_step_2",
        scenarioId: "scn_custom_01",
        position: 2,
        moduleType: "fb.ad_insights",
        config: {
          fbAccountId: ACC_01.fbAccountId,
          dateWindowDays: 7,
          metrics: ["impressions", "reach", "spend", "clicks", "ctr"],
        },
      },
      {
        id: "scn_custom_01_step_3",
        scenarioId: "scn_custom_01",
        position: 3,
        moduleType: "sheets.append",
        config: {
          spreadsheetId: ACC_01.spreadsheetId,
          tabName: "DailyRoundup",
          mappedFields: ["impressions", "reach", "spend", "clicks", "ctr"],
        },
      },
    ],
    lastRunAt: relative(-3 * (12 * HOUR) - 3 * 30 * MINUTE),
    lastRunStatus: "success",
    createdAt: relative(-21 * DAY),
    updatedAt: relative(-2 * DAY),
  },
  {
    id: "scn_custom_02",
    userId: MOCK_USER.id,
    name: "Weekly campaign performance",
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
        moduleType: "fb.campaign_insights",
        config: {
          fbAccountId: ACC_02.fbAccountId,
          dateWindowDays: 7,
          metrics: ["impressions", "clicks", "spend", "cpc", "ctr"],
        },
      },
      {
        id: "scn_custom_02_step_3",
        scenarioId: "scn_custom_02",
        position: 3,
        moduleType: "sheets.upsert",
        config: {
          spreadsheetId: ACC_02.spreadsheetId,
          tabName: "WeeklyCampaigns",
          keyFields: ["date", "campaign_id"],
          mappedFields: ["impressions", "clicks", "spend", "cpc", "ctr"],
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
    name: "Manual ad spot-check",
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
        moduleType: "fb.ad_insights",
        config: {
          fbAccountId: ACC_01.fbAccountId,
          dateWindowDays: 3,
          metrics: ["impressions", "spend", "video_views"],
        },
      },
      {
        id: "scn_custom_03_step_3",
        scenarioId: "scn_custom_03",
        position: 3,
        moduleType: "sheets.append",
        config: {
          spreadsheetId: ACC_01.spreadsheetId,
          tabName: "AdSpotChecks",
          mappedFields: ["impressions", "spend", "video_views"],
        },
      },
    ],
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: relative(-5 * DAY),
    updatedAt: relative(-5 * DAY),
  },
  {
    id: "scn_custom_04",
    userId: MOCK_USER.id,
    name: "Hourly velocity check",
    kind: "CUSTOM",
    enabled: true,
    steps: [
      {
        id: "scn_custom_04_step_1",
        scenarioId: "scn_custom_04",
        position: 1,
        moduleType: "trigger.schedule",
        config: { cronExpression: "0 * * * *", timezone: "Asia/Tashkent" },
      },
      {
        id: "scn_custom_04_step_2",
        scenarioId: "scn_custom_04",
        position: 2,
        moduleType: "fb.campaign_insights",
        config: {
          fbAccountId: ACC_02.fbAccountId,
          dateWindowDays: 1,
          metrics: ["impressions", "clicks", "spend"],
        },
      },
      {
        id: "scn_custom_04_step_3",
        scenarioId: "scn_custom_04",
        position: 3,
        moduleType: "sheets.upsert",
        config: {
          spreadsheetId: ACC_02.spreadsheetId,
          tabName: "VelocityCheck",
          keyFields: ["date", "hour", "campaign_id"],
          mappedFields: ["impressions", "clicks", "spend"],
        },
      },
    ],
    // Most recent run for this scenario (i=1 in the run mapping below) is failed.
    lastRunAt: relative(-1 * (12 * HOUR) - 1 * 30 * MINUTE),
    lastRunStatus: "failed",
    createdAt: relative(-9 * DAY),
    updatedAt: relative(-3 * HOUR),
  },
];

// Map run-index `i` → scenarioId. Distribution chosen so:
//   - acc_01 (i % 3 === 0): 5 → scn_quick_acc_01, 5 → scn_custom_01
//   - acc_02 (i % 3 === 1): 5 → scn_quick_acc_02, 2 → scn_custom_02, 3 → scn_custom_04
//   - acc_03 (i % 3 === 2): 10 → scn_quick_acc_03
//   - scn_custom_03 gets 0 runs (it's disabled, never been run)
//   - scn_custom_04's most recent run (i=1) is failed → matches lastRunStatus
const ACC02_CUSTOM04 = new Set([1, 7, 13]);
const ACC02_CUSTOM02 = new Set([4, 25]);
const ACC01_CUSTOM01 = new Set([3, 9, 15, 21, 27]);

function scenarioIdForRun(i: number): string {
  if (i % 3 === 2) return `scn_quick_${ACC_03.id}`;
  if (i % 3 === 0) {
    return ACC01_CUSTOM01.has(i) ? "scn_custom_01" : `scn_quick_${ACC_01.id}`;
  }
  if (ACC02_CUSTOM04.has(i)) return "scn_custom_04";
  if (ACC02_CUSTOM02.has(i)) return "scn_custom_02";
  return `scn_quick_${ACC_02.id}`;
}

const FB_ERROR_MESSAGES = [
  "Facebook API rate limit exceeded for ad account act_209384756102837. Reset in 17 minutes.",
  "Invalid access token: token has expired. Reconnect Facebook account in Connections.",
  "Insights API returned partial data: campaign 23845678234 missing for date range.",
  "Sheets API quota exceeded: 60 requests/min. Backoff 30s, then retry.",
  "Network timeout reading insights for ad set 6066123456789 after 30s.",
  "Permissions error: ads_read scope missing on token. Reauthorize Facebook.",
  "Spreadsheet not found: ID '1xY9vZ3kP7nR2qL5mT8uH3bC6dF4eG0hJsK7wN2oQ8pW' returned 404.",
  "Conflicting concurrent run for account act_209384756102837 — previous still in flight.",
];

function pickStatus(idx: number, total: number): RunStatus {
  // 20 success, 8 failed, 1 running, 1 queued — distribute across the 30
  if (idx === total - 1) return "queued";
  if (idx === total - 2) return "running";
  if (idx % 4 === 1) return "failed"; // gives roughly 8 of 30
  return "success";
}

const accountIds = MOCK_AD_ACCOUNTS.map((a) => a.id);

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
          : 800 + Math.floor(((i * 7919) % 44200));
    const finishedAt =
      durationMs !== null ? new Date(startedAt.getTime() + durationMs) : null;
    const campaignLevel = i % 2 === 0;
    const adLevel = i % 3 !== 0;
    const accountId = accountIds[i % accountIds.length] ?? accountIds[0]!;
    runs.push({
      id: `run_${String(i + 1).padStart(3, "0")}`,
      userId: MOCK_USER.id,
      adAccountId: accountId,
      scenarioId: scenarioIdForRun(i),
      trigger,
      status,
      startedAt,
      finishedAt,
      campaignRowsWritten:
        status === "success" && campaignLevel ? 8 + (i % 30) : null,
      adRowsWritten: status === "success" && adLevel ? 24 + (i % 80) : null,
      durationMs,
      errorMessage:
        status === "failed"
          ? (FB_ERROR_MESSAGES[i % FB_ERROR_MESSAGES.length] ?? null)
          : null,
      sheetsUrl:
        status === "success"
          ? "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV"
          : null,
    });
  }
  return runs;
}

export const MOCK_RUNS: Run[] = buildRuns();

const failedRuns = MOCK_RUNS.filter((r) => r.status === "failed");

const LOG_BREADCRUMBS = [
  "Starting sync.",
  "Refreshed Facebook access token.",
  "Resolved date window 2026-05-02 → 2026-05-09.",
  "Fetched 14 active campaigns.",
  "Fetched 87 active ads.",
  "Beginning insights fetch (level=CAMPAIGN).",
  "Beginning insights fetch (level=AD).",
];

function buildLogs(): RunLog[] {
  const logs: RunLog[] = [];
  let counter = 1;
  for (const run of failedRuns) {
    const breadcrumbCount = 5 + ((counter * 3) % 2); // 5 or 6 breadcrumbs
    const start = run.startedAt.getTime();
    for (let j = 0; j < breadcrumbCount; j++) {
      const msg =
        LOG_BREADCRUMBS[j % LOG_BREADCRUMBS.length] ?? "Working...";
      logs.push({
        id: `log_${String(counter).padStart(3, "0")}`,
        runId: run.id,
        level: "INFO",
        message: msg,
        meta:
          j === 3
            ? { campaigns_count: 14, ads_count: 87 }
            : null,
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
        fb_error_code: 17 + (counter % 13),
        retries: counter % 4,
        endpoint: "/v19.0/act_209384756102837/insights",
      },
      timestamp: new Date(start + breadcrumbCount * 800 + 500),
    });
    counter++;
  }
  return logs;
}

export const MOCK_RUN_LOGS: RunLog[] = buildLogs();
