import type {
  AdAccount,
  OAuthConnection,
  Run,
  RunLog,
  RunStatus,
  RunTrigger,
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
