import { randomBytes } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { google } from "googleapis";

import { listAdAccounts } from "../src/integrations/facebook/graph-client";
import { getAuthedClient } from "../src/integrations/google/oauth";
import { writeValues } from "../src/integrations/google/sheets-client";

const db = new PrismaClient();

const USER_EMAIL = "jumanovsamandar005@gmail.com";
const SHEET_ID = "1Pz-aZ84RdeEIXdlJZuCem08DifUu22buGHn8bWXZ4i8";
const EXAMPLES_FOLDER_NAME = "Examples";
const EXAMPLE_PREFIX = "[EX]";
const BASE_URL = "http://localhost:3000/scenarios";

const TAB_HEADERS = {
  ExAdAccounts: [
    "account_id",
    "name",
    "currency",
    "timezone_name",
    "account_status",
  ],
  ExAccountInsights: [
    "date",
    "account_id",
    "account_name",
    "impressions",
    "clicks",
    "spend",
    "cpm",
    "ctr",
    "reach",
  ],
  ExCampaignInsights: [
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
  ],
  ExAdInsights: [
    "date",
    "ad_id",
    "ad_name",
    "campaign_id",
    "adset_id",
    "impressions",
    "clicks",
    "spend",
    "ctr",
    "cpc",
  ],
  ExAppendDemo: ["id", "name", "email", "status"],
  ExUpsertDemo: ["id", "name", "email", "status"],
  ExFindDemo: ["id", "name", "email"],
  ExUpdateDemo: ["id", "name", "email", "status"],
  ExWebhookDemo: ["receivedAt", "body"],
  ExScheduleDemo: [
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
  ],
  ExWatchSheetsDemo: ["id", "name", "email", "status"],
  ExWatchBitrixDemo: ["leadId", "title", "sourceId"],
} as const;

type StepSeed = {
  position: number;
  moduleType: string;
  config: Record<string, unknown>;
};

type ScenarioSeed = {
  name: string;
  enabled: boolean;
  webhookSecret?: string | null;
  steps: StepSeed[];
};

type CreatedScenario = {
  id: string;
  name: string;
};

function toJsonInput(config: Record<string, unknown>): Prisma.InputJsonValue {
  return config as Prisma.InputJsonValue;
}

function write(message: string): void {
  process.stdout.write(`${message}\n`);
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
  const lastColumn = columnLetter(headers.length - 1);
  return `${tabName}!A1:${lastColumn}1`;
}

function columnLetter(idx: number): string {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
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

  await writeValues(userId, SHEET_ID, headerRange(tabName, headers), [
    [...headers],
  ]);
  write(`${tabName} headers written: ${headers.join(", ")}`);
}

async function ensureExampleTabs(userId: string): Promise<void> {
  for (const [tabName, headers] of Object.entries(TAB_HEADERS)) {
    await ensureSheetTabWithHeaders(userId, tabName, headers);
  }
}

async function findOrCreateExamplesFolder(userId: string): Promise<{ id: string }> {
  const existing = await db.folder.findFirst({
    where: {
      userId,
      parentId: null,
      name: EXAMPLES_FOLDER_NAME,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return db.folder.create({
    data: {
      userId,
      parentId: null,
      name: EXAMPLES_FOLDER_NAME,
    },
    select: { id: true },
  });
}

async function pickFacebookAdAccount(userId: string): Promise<string | null> {
  try {
    const accounts = await listAdAccounts(userId);
    if (accounts.length === 0) {
      write("Skipping FB examples - no FB connection or accounts");
      return null;
    }

    const accountId = accounts[0]!.id;
    write(`FB ad account picked: ${accountId}`);
    return accountId;
  } catch (error) {
    write(`Skipping FB examples - no FB connection or accounts: ${errorMessage(error)}`);
    return null;
  }
}

function fbScenarioSeeds(fbAccountId: string): ScenarioSeed[] {
  return [
    {
      // Dual coverage: this one flow exercises both trigger.manual and
      // fb.list_ad_accounts, so it intentionally appears once in the seed.
      name: "[EX] Manual: list FB accounts",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        { position: 2, moduleType: "fb.list_ad_accounts", config: {} },
        {
          position: 3,
          moduleType: "sheets.append",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExAdAccounts",
            mappedFields: {
              account_id: "{{id}}",
              name: "",
              currency: "",
              timezone_name: "",
              account_status: "{{status}}",
            },
          },
        },
      ],
    },
    {
      name: "[EX] Schedule: daily campaign metrics",
      enabled: true,
      steps: [
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
            fbAccountId,
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
            tabName: "ExScheduleDemo",
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
    {
      name: "[EX] FB account insights -> Sheet",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "fb.account_insights",
          config: {
            fbAccountId,
            dateWindowDays: 7,
            metrics: ["impressions", "clicks", "spend", "cpm", "ctr", "reach"],
          },
        },
        {
          position: 3,
          moduleType: "sheets.append",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExAccountInsights",
            mappedFields: {
              date: "",
              account_id: "",
              account_name: "",
              impressions: "",
              clicks: "",
              spend: "",
              cpm: "",
              ctr: "",
              reach: "",
            },
          },
        },
      ],
    },
    {
      name: "[EX] FB campaign insights -> Sheet",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "fb.campaign_insights",
          config: {
            fbAccountId,
            dateWindowDays: 7,
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
            tabName: "ExCampaignInsights",
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
    {
      name: "[EX] FB ad insights -> Sheet",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "fb.ad_insights",
          config: {
            fbAccountId,
            dateWindowDays: 7,
            metrics: ["impressions", "clicks", "spend", "ctr", "cpc"],
          },
        },
        {
          position: 3,
          moduleType: "sheets.upsert",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExAdInsights",
            keyFields: ["date", "ad_id"],
            mappedFields: {
              date: "",
              ad_id: "",
              ad_name: "",
              campaign_id: "",
              adset_id: "",
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
  ];
}

function nonFbScenarioSeeds(): ScenarioSeed[] {
  return [
    {
      name: "[EX] Webhook: append to sheet",
      enabled: true,
      webhookSecret: randomBytes(32).toString("hex"),
      steps: [
        { position: 1, moduleType: "trigger.webhook", config: {} },
        {
          position: 2,
          moduleType: "sheets.append",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExWebhookDemo",
            mappedFields: {
              receivedAt: "",
              body: "{{body}}",
            },
          },
        },
      ],
    },
    {
      name: "[EX] Watch sheet -> Bitrix lead",
      enabled: true,
      steps: [
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
            comments: "Auto-created from Sheet1 row {{row}}",
          },
        },
      ],
    },
    {
      name: "[EX] Watch Bitrix -> append sheet",
      enabled: true,
      steps: [
        {
          position: 1,
          moduleType: "trigger.watch.bitrix_new_lead",
          config: {},
        },
        {
          position: 2,
          moduleType: "sheets.append",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExWatchBitrixDemo",
            mappedFields: {
              leadId: "{{id}}",
              title: "",
              sourceId: "",
            },
          },
        },
      ],
    },
    {
      name: "[EX] Sheets append demo",
      enabled: false,
      steps: [
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
            tabName: "ExAppendDemo",
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
    {
      name: "[EX] Sheets upsert demo",
      enabled: false,
      steps: [
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
          moduleType: "sheets.upsert",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExUpsertDemo",
            keyFields: ["id"],
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
    {
      name: "[EX] Sheets find_rows demo",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "sheets.find_rows",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "Sheet1",
            searchColumn: "status",
            searchValue: "new",
          },
        },
        {
          position: 3,
          moduleType: "sheets.append",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "ExFindDemo",
            mappedFields: {
              id: "",
              name: "",
              email: "",
            },
          },
        },
      ],
    },
    {
      name: "[EX] Sheets update_row demo",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "sheets.find_rows",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "Sheet1",
            searchColumn: "status",
            searchValue: "new",
          },
        },
        {
          position: 3,
          moduleType: "sheets.update_row",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "Sheet1",
            rowIdentifier: "{{row}}",
            mappedFields: {
              status: "contacted",
            },
          },
        },
      ],
    },
    {
      name: "[EX] Bitrix create_lead demo",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "sheets.find_rows",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "Sheet1",
            searchColumn: "status",
            searchValue: "new",
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
            comments: "Auto-created by example scenario",
          },
        },
      ],
    },
    {
      name: "[EX] Bitrix update_lead demo",
      enabled: false,
      steps: [
        { position: 1, moduleType: "trigger.manual", config: {} },
        {
          position: 2,
          moduleType: "sheets.find_rows",
          config: {
            spreadsheetId: SHEET_ID,
            tabName: "Sheet1",
            searchColumn: "status",
            searchValue: "new",
          },
        },
        {
          position: 3,
          moduleType: "bitrix.update_lead",
          config: {
            leadId: "{{id}}",
            statusId: "IN_PROCESS",
            comments: "Updated by example scenario",
          },
        },
      ],
    },
  ];
}

async function createScenario(
  userId: string,
  folderId: string,
  seed: ScenarioSeed,
): Promise<CreatedScenario> {
  return db.scenario.create({
    data: {
      userId,
      folderId,
      name: seed.name,
      kind: "CUSTOM",
      enabled: seed.enabled,
      webhookSecret: seed.webhookSecret ?? null,
      steps: {
        create: seed.steps.map((step) => ({
          position: step.position,
          moduleType: step.moduleType,
          config: toJsonInput(step.config),
        })),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
}

async function main(): Promise<void> {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  const examplesFolder = await findOrCreateExamplesFolder(user.id);
  await ensureExampleTabs(user.id);
  const fbAccountId = await pickFacebookAdAccount(user.id);

  await db.scenario.deleteMany({
    where: {
      userId: user.id,
      folderId: examplesFolder.id,
      name: { startsWith: EXAMPLE_PREFIX },
    },
  });

  const seeds = [
    ...(fbAccountId ? fbScenarioSeeds(fbAccountId) : []),
    ...nonFbScenarioSeeds(),
  ];

  const scenarios: CreatedScenario[] = [];
  for (const seed of seeds) {
    scenarios.push(await createScenario(user.id, examplesFolder.id, seed));
  }

  write("");
  write(`Examples folder: ${examplesFolder.id}`);
  for (const scenario of scenarios) {
    write(`${scenario.name}: ${scenario.id} ${BASE_URL}/${scenario.id}`);
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
