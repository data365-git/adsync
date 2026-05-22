import { PrismaClient } from "@prisma/client";

import {
  clearRange,
  readValues,
  writeValues,
} from "../src/integrations/google/sheets-client";
import { getAuthedClient } from "../src/integrations/google/oauth";
import { listAdAccounts } from "../src/integrations/facebook/graph-client";
import { google } from "googleapis";

const db = new PrismaClient();

const USER_EMAIL = "jumanovsamandar005@gmail.com";
const SHEET_ID = "1Pz-aZ84RdeEIXdlJZuCem08DifUu22buGHn8bWXZ4i8";
const BASE_URL = "http://localhost:3000/scenarios";
const SMOKE_FOLDER_NAME = "Smoke tests";
const FIRST_FB_AD_ACCOUNT = "act_637796540549676";
const FB_INSIGHTS_TAB = "FbInsights";
const FB_INSIGHTS_HEADERS = [
  "date",
  "impressions",
  "clicks",
  "spend",
  "cpm",
  "ctr",
] as const;
const FB_SMOKE_NAME = "[SMOKE-FB] FB -> Sheet";
const FB_AD_ACCOUNTS_SMOKE_NAME = "[SMOKE-FB] List ad accounts → Sheet";
const FB_DAILY_CAMPAIGNS_SMOKE_NAME =
  "[SMOKE-FB] Daily campaign metrics → Sheet upsert";
const FB_AD_METRICS_SMOKE_NAME = "[SMOKE-FB] Hourly ad metrics → Sheet upsert";
const FB_AD_ACCOUNTS_TAB = "FbAdAccounts";
const FB_DAILY_CAMPAIGNS_TAB = "FbDailyCampaigns";
const FB_AD_METRICS_TAB = "FbAdMetrics";
const FB_AD_ACCOUNTS_HEADERS = [
  "account_id",
  "name",
  "currency",
  "timezone_name",
  "account_status",
] as const;
const FB_DAILY_CAMPAIGNS_HEADERS = [
  "date",
  "campaign_id",
  "campaign_name",
  "impressions",
  "clicks",
  "spend",
  "ctr",
  "cpm",
  "cpc",
  "reach",
] as const;
const FB_AD_METRICS_HEADERS = [
  "date",
  "ad_id",
  "ad_name",
  "impressions",
  "clicks",
  "spend",
  "ctr",
  "cpc",
] as const;

const smokeNames = [
  "[SMOKE] Sheet → Bitrix lead",
  "[SMOKE] Sheet → Sheet append",
  "[SMOKE] Watch new rows → Bitrix lead",
] as const;
const EXPECTED_HEADERS = ["id", "name", "email", "status"] as const;
const SAMPLE_ROWS = [
  ["1", "Alice", "alice@example.com", "new"],
  ["2", "Bob", "bob@example.com", "contacted"],
  ["3", "Carol", "carol@example.com", "new"],
  ["4", "Dave", "dave@example.com", "qualified"],
  ["5", "Eve", "eve@example.com", "new"],
];

function write(message: string): void {
  process.stdout.write(`${message}\n`);
}

function headersMatch(headers: string[]): boolean {
  return (
    headers.length === EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((header, idx) => headers[idx] === header)
  );
}

async function resetSmokeSheetIfNeeded(userId: string): Promise<void> {
  const rows = await readValues(userId, SHEET_ID, "Sheet1!1:1");
  const headers = rows[0] ?? [];

  write(`Sheet1 headers before reset check: ${headers.join(", ") || "(empty)"}`);

  if (headersMatch(headers)) {
    write("Sheet1 reset skipped: headers already match.");
    return;
  }

  await clearRange(userId, SHEET_ID, "Sheet1!A:Z");
  await writeValues(userId, SHEET_ID, "Sheet1!A1:D6", [
    [...EXPECTED_HEADERS],
    ...SAMPLE_ROWS,
  ]);
  write("Sheet1 reset: wrote smoke headers and 5 sample rows.");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const maybeError = error as { code?: unknown; response?: { status?: unknown } };
  if (typeof maybeError.code === "number") return maybeError.code;
  if (typeof maybeError.response?.status === "number") {
    return maybeError.response.status;
  }
  return undefined;
}

function headerRange(tabName: string, headers: readonly string[]): string {
  const lastColumn = String.fromCharCode("A".charCodeAt(0) + headers.length - 1);
  return `${tabName}!A1:${lastColumn}1`;
}

async function ensureSheetTabWithHeaders(
  userId: string,
  tabName: string,
  headers: readonly string[],
): Promise<void> {
  const auth = await getAuthedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some(
    (sheet) => sheet.properties?.title === tabName,
  );

  if (!exists) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      });
      write(`${tabName} tab created.`);
    } catch (error) {
      const message = errorMessage(error);
      if (!(errorCode(error) === 400 && message.includes("already exists"))) {
        throw error;
      }
      write(`${tabName} tab already existed.`);
    }
  } else {
    write(`${tabName} tab already existed.`);
  }

  await writeValues(userId, SHEET_ID, headerRange(tabName, headers), [[...headers]]);
  write(`${tabName} headers written: ${headers.join(", ")}`);
}

async function ensureFbInsightsTab(userId: string): Promise<"created" | "already existed"> {
  const auth = await getAuthedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some(
    (sheet) => sheet.properties?.title === FB_INSIGHTS_TAB,
  );
  if (exists) {
    write(`${FB_INSIGHTS_TAB} tab already existed.`);
    return "already existed";
  }

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: FB_INSIGHTS_TAB } } }],
      },
    });
  } catch (error) {
    const message = errorMessage(error);
    if (errorCode(error) === 400 && message.includes("already exists")) {
      write(`${FB_INSIGHTS_TAB} tab already existed.`);
      return "already existed";
    }
    throw error;
  }

  await writeValues(userId, SHEET_ID, `${FB_INSIGHTS_TAB}!A1:F1`, [
    [...FB_INSIGHTS_HEADERS],
  ]);
  write(`${FB_INSIGHTS_TAB} tab created with headers.`);
  return "created";
}

async function pickFacebookAdAccount(userId: string): Promise<string | null> {
  try {
    const accounts = await listAdAccounts(userId);
    write(`FB ad accounts detected: ${accounts.length}`);
    if (accounts.length === 0) {
      write("No FB ad accounts — skipping FB SMOKE");
      return null;
    }

    const accountId = accounts[0]!.id;
    write(`FB ad account picked: ${accountId}`);
    return accountId;
  } catch (error) {
    write(`FB connection unhealthy: ${errorMessage(error)}`);
    return null;
  }
}

async function main(): Promise<void> {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  const fbAccountId = await pickFacebookAdAccount(user.id);
  await resetSmokeSheetIfNeeded(user.id);
  const smokeFolder =
    (await db.folder.findFirst({
      where: {
        userId: user.id,
        parentId: null,
        name: SMOKE_FOLDER_NAME,
      },
    })) ??
    (await db.folder.create({
      data: {
        userId: user.id,
        parentId: null,
        name: SMOKE_FOLDER_NAME,
      },
    }));

  await db.scenario.deleteMany({
    where: {
      userId: user.id,
      name: {
        in: [
          ...smokeNames,
          FB_SMOKE_NAME,
          FB_AD_ACCOUNTS_SMOKE_NAME,
          FB_DAILY_CAMPAIGNS_SMOKE_NAME,
          FB_AD_METRICS_SMOKE_NAME,
        ],
      },
    },
  });

  const scenarioCreates = [
    db.scenario.create({
      data: {
        userId: user.id,
        name: smokeNames[0],
        kind: "CUSTOM",
        enabled: false,
        steps: {
          create: [
            { position: 1, moduleType: "trigger.manual", config: {} },
            {
              position: 2,
              moduleType: "sheets.find_rows",
              config: {
                spreadsheetId: SHEET_ID,
                tabName: "Sheet1",
                filterColumn: "status",
                filterValue: "new",
                limit: 5,
              },
            },
            {
              position: 3,
              moduleType: "bitrix.create_lead",
              config: {
                title: "Lead from {{name}}",
                name: "{{name}}",
                email: "{{email}}",
                sourceId: "WEB",
                comments: "Auto created — id={{id}}",
              },
            },
          ],
        },
      },
    }),
    db.scenario.create({
      data: {
        userId: user.id,
        name: smokeNames[1],
        kind: "CUSTOM",
        enabled: false,
        steps: {
          create: [
            { position: 1, moduleType: "trigger.manual", config: {} },
            {
              position: 2,
              moduleType: "sheets.find_rows",
              config: {
                spreadsheetId: SHEET_ID,
                tabName: "Sheet1",
              },
            },
            {
              position: 3,
              moduleType: "sheets.append",
              config: {
                spreadsheetId: SHEET_ID,
                tabName: "SmokeMirror",
                mappedFields: {
                  id: "",
                  name: "",
                  email: "",
                  status: "",
                },
              },
            },
          ],
        },
      },
    }),
    db.scenario.create({
      data: {
        userId: user.id,
        name: smokeNames[2],
        kind: "CUSTOM",
        enabled: true,
        steps: {
          create: [
            {
              position: 1,
              moduleType: "trigger.watch.sheets_new_rows",
              config: {
                spreadsheetId: SHEET_ID,
                tabName: "Sheet1",
                watchColumn: "id",
              },
            },
            {
              position: 2,
              moduleType: "bitrix.create_lead",
              config: {
                title: "Lead from {{name}}",
                name: "{{name}}",
                email: "{{email}}",
                sourceId: "WEB",
                comments: "Auto created — id={{id}}",
              },
            },
          ],
        },
      },
    }),
  ];

  if (fbAccountId) {
    await ensureFbInsightsTab(user.id);
    await ensureSheetTabWithHeaders(
      user.id,
      FB_AD_ACCOUNTS_TAB,
      FB_AD_ACCOUNTS_HEADERS,
    );
    await ensureSheetTabWithHeaders(
      user.id,
      FB_DAILY_CAMPAIGNS_TAB,
      FB_DAILY_CAMPAIGNS_HEADERS,
    );
    await ensureSheetTabWithHeaders(user.id, FB_AD_METRICS_TAB, FB_AD_METRICS_HEADERS);
    scenarioCreates.push(
      db.scenario.create({
        data: {
          userId: user.id,
          name: FB_SMOKE_NAME,
          kind: "CUSTOM",
          enabled: false,
          steps: {
            create: [
              { position: 1, moduleType: "trigger.manual", config: {} },
              {
                position: 2,
                moduleType: "fb.account_insights",
                config: {
                  fbAccountId,
                  dateWindowDays: 7,
                  metrics: ["impressions", "clicks", "spend", "cpm", "ctr"],
                },
              },
              {
                position: 3,
                moduleType: "sheets.append",
                config: {
                  spreadsheetId: SHEET_ID,
                  tabName: FB_INSIGHTS_TAB,
                  mappedFields: {
                    date: "",
                    impressions: "",
                    clicks: "",
                    spend: "",
                    cpm: "",
                    ctr: "",
                  },
                },
              },
            ],
          },
        },
      }),
      db.scenario.create({
        data: {
          userId: user.id,
          name: FB_AD_ACCOUNTS_SMOKE_NAME,
          kind: "CUSTOM",
          enabled: false,
          folderId: smokeFolder.id,
          steps: {
            create: [
              { position: 1, moduleType: "trigger.manual", config: {} },
              { position: 2, moduleType: "fb.list_ad_accounts", config: {} },
              {
                position: 3,
                moduleType: "sheets.append",
                config: {
                  spreadsheetId: SHEET_ID,
                  tabName: FB_AD_ACCOUNTS_TAB,
                  mappedFields: {
                    account_id: "",
                    name: "",
                    currency: "",
                    timezone_name: "",
                    account_status: "",
                  },
                },
              },
            ],
          },
        },
      }),
      db.scenario.create({
        data: {
          userId: user.id,
          name: FB_DAILY_CAMPAIGNS_SMOKE_NAME,
          kind: "CUSTOM",
          enabled: true,
          folderId: smokeFolder.id,
          steps: {
            create: [
              {
                position: 1,
                moduleType: "trigger.schedule",
                config: {
                  cronExpression: "0 6 * * *",
                  timezone: "Asia/Tashkent",
                },
              },
              {
                position: 2,
                moduleType: "fb.campaign_insights",
                config: {
                  fbAccountId: FIRST_FB_AD_ACCOUNT,
                  dateWindowDays: 1,
                  metrics: [
                    "impressions",
                    "clicks",
                    "spend",
                    "ctr",
                    "cpm",
                    "cpc",
                    "reach",
                  ],
                },
              },
              {
                position: 3,
                moduleType: "sheets.upsert",
                config: {
                  spreadsheetId: SHEET_ID,
                  tabName: FB_DAILY_CAMPAIGNS_TAB,
                  keyFields: ["date", "campaign_id"],
                  mappedFields: {
                    date: "",
                    campaign_id: "",
                    campaign_name: "",
                    impressions: "",
                    clicks: "",
                    spend: "",
                    ctr: "",
                    cpm: "",
                    cpc: "",
                    reach: "",
                  },
                },
              },
            ],
          },
        },
      }),
      db.scenario.create({
        data: {
          userId: user.id,
          name: FB_AD_METRICS_SMOKE_NAME,
          kind: "CUSTOM",
          enabled: true,
          folderId: smokeFolder.id,
          steps: {
            create: [
              {
                position: 1,
                moduleType: "trigger.schedule",
                config: {
                  cronExpression: "0 */4 * * *",
                  timezone: "Asia/Tashkent",
                },
              },
              {
                position: 2,
                moduleType: "fb.ad_insights",
                config: {
                  fbAccountId: FIRST_FB_AD_ACCOUNT,
                  dateWindowDays: 1,
                  metrics: ["impressions", "clicks", "spend", "ctr", "cpc"],
                },
              },
              {
                position: 3,
                moduleType: "sheets.upsert",
                config: {
                  spreadsheetId: SHEET_ID,
                  tabName: FB_AD_METRICS_TAB,
                  keyFields: ["date", "ad_id"],
                  mappedFields: {
                    date: "",
                    ad_id: "",
                    ad_name: "",
                    impressions: "",
                    clicks: "",
                    spend: "",
                    ctr: "",
                    cpc: "",
                  },
                },
              },
            ],
          },
        },
      }),
    );
  }

  const scenarios = await Promise.all(scenarioCreates);

  for (const scenario of scenarios) {
    write(`${scenario.name}: ${scenario.id}`);
    write(`${BASE_URL}/${scenario.id}`);
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
