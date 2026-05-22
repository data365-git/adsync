import { PrismaClient, type Run, type RunLog, type ScenarioStep } from "@prisma/client";

import {
  getAccountInsights,
  listAdAccounts,
} from "../src/integrations/facebook/graph-client";
import { readTabRows, readValues } from "../src/integrations/google/sheets-client";
import { call as bitrixCall } from "../src/server/bitrix24/client";
import { executeRun } from "../src/server/core/executor";

const USER_EMAIL = "jumanovsamandar005@gmail.com";

const db = new PrismaClient();

const SHEET_TO_SHEET_NAME = "[SMOKE] Sheet -> Sheet append";
const SHEET_TO_BITRIX_NAME = "[SMOKE] Sheet -> Bitrix lead";
const DEFAULT_POLL_TIMEOUT_MS = 60_000;
const FB_METRICS = ["impressions", "clicks", "spend", "reach"] as const;
const REQUIRED_SHEET_COLUMNS = ["id", "name", "email", "status"] as const;

type RunWithLogs = Run & { logs: RunLog[] };

type SheetTarget = {
  spreadsheetId: string;
  tabName: string;
  stepPosition: number;
};

type BitrixEmail = {
  VALUE?: unknown;
  VALUE_TYPE?: unknown;
};

type BitrixLead = {
  ID?: unknown;
  TITLE?: unknown;
  NAME?: unknown;
  EMAIL?: BitrixEmail[];
  COMMENTS?: unknown;
  SOURCE_ID?: unknown;
  DATE_CREATE?: unknown;
};

function write(message = ""): void {
  process.stdout.write(`${message}\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMeta(log: RunLog): Record<string, unknown> {
  return isRecord(log.meta) ? log.meta : {};
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return JSON.stringify(value) ?? String(value);
}

function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, idx) =>
    Math.max(header.length, ...rows.map((row) => row[idx]?.length ?? 0)),
  );
  const format = (row: string[]) =>
    row.map((cell, idx) => cell.padEnd(widths[idx] ?? 0)).join(" | ");

  write(format(headers));
  write(widths.map((width) => "-".repeat(width)).join("-|-"));
  for (const row of rows) write(format(row));
}

async function pollRun(
  runId: string,
  timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
): Promise<RunWithLogs> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await db.run.findUnique({
      where: { id: runId },
      include: { logs: { orderBy: { ts: "asc" } } },
    });
    if (!run) throw new Error(`Run disappeared: ${runId}`);
    if (run.status !== "RUNNING" && run.status !== "QUEUED") return run;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Run did not finish within ${timeoutMs / 1_000}s: ${runId}`);
}

async function executeAndWait(scenarioId: string, userId: string): Promise<RunWithLogs> {
  const runId = await executeRun(scenarioId, "MANUAL", userId);
  return pollRun(runId);
}

function completedStepRowCounts(logs: RunLog[]): Array<{
  position: number | null;
  message: string;
  rowCount: number;
}> {
  return logs
    .filter((log) => log.message.startsWith("Completed step"))
    .map((log) => {
      const meta = getMeta(log);
      return {
        position: typeof meta.position === "number" ? meta.position : null,
        message: log.message,
        rowCount: typeof meta.rowCount === "number" ? meta.rowCount : 0,
      };
    });
}

function rowCountForStep(logs: RunLog[], stepPosition: number): number {
  return completedStepRowCounts(logs)
    .filter((entry) => entry.position === stepPosition)
    .reduce((total, entry) => total + entry.rowCount, 0);
}

function getConfigString(
  step: ScenarioStep,
  key: "spreadsheetId" | "tabName",
): string {
  if (!isRecord(step.config) || typeof step.config[key] !== "string") {
    throw new Error(`Step ${step.position} is missing config.${key}`);
  }
  return step.config[key];
}

function getSheetTarget(steps: ScenarioStep[]): SheetTarget {
  const appendStep = steps.find((step) => step.moduleType === "sheets.append");
  if (!appendStep) throw new Error("Scenario is missing sheets.append step");
  return {
    spreadsheetId: getConfigString(appendStep, "spreadsheetId"),
    tabName: getConfigString(appendStep, "tabName"),
    stepPosition: appendStep.position,
  };
}

function getFirstEmailValue(lead: BitrixLead): string {
  const email = lead.EMAIL?.[0]?.VALUE;
  return typeof email === "string" ? email : "";
}

function leadValidation(lead: BitrixLead): {
  id: string;
  title: string;
  name: string;
  email: string;
  comments: string;
  valid: boolean;
  issues: string;
} {
  const id = formatCell(lead.ID);
  const title = formatCell(lead.TITLE);
  const name = formatCell(lead.NAME);
  const email = getFirstEmailValue(lead);
  const comments = formatCell(lead.COMMENTS);
  const expectedTitle = `Lead from ${name}`;
  const expectedEmail = `${name.toLowerCase()}@example.com`;
  const issues: string[] = [];

  if (title !== expectedTitle) issues.push(`TITLE expected "${expectedTitle}"`);
  if (email !== expectedEmail) issues.push(`EMAIL expected "${expectedEmail}"`);
  if (!/^Auto created (?:—|â€”|-) id=\d+$/.test(comments)) {
    issues.push("COMMENTS missing Auto created id marker");
  }

  return {
    id,
    title,
    name,
    email,
    comments,
    valid: issues.length === 0,
    issues: issues.join("; "),
  };
}

async function callBitrix<T>(
  userId: string,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  void userId;
  return bitrixCall<T>(method, params);
}

async function reportFacebook(userId: string): Promise<void> {
  write("REPORT 1: FB ad-account data scan");
  const accounts = await listAdAccounts(userId);
  const rows: Array<{
    accountId: string;
    name: string;
    accountStatus: string;
    rows90d: number;
    rows730d: number | null;
  }> = [];

  for (const account of accounts) {
    const rows90d = await getAccountInsights(userId, {
      fbAccountId: account.id,
      level: "account",
      metrics: [...FB_METRICS],
      dateWindowDays: 90,
    });
    let rows730d: number | null = null;
    if (rows90d.length === 0) {
      const fallbackRows = await getAccountInsights(userId, {
        fbAccountId: account.id,
        level: "account",
        metrics: [...FB_METRICS],
        dateWindowDays: 730,
      });
      rows730d = fallbackRows.length;
    }
    rows.push({
      accountId: account.id,
      name: account.name,
      accountStatus: formatCell(account.account_status),
      rows90d: rows90d.length,
      rows730d,
    });
  }

  const max90d = Math.max(0, ...rows.map((row) => row.rows90d));
  printTable(
    [
      "account_id",
      "name",
      "account_status",
      "90d_rows",
      "730d_rows",
      "recommendation",
    ],
    rows.map((row) => [
      row.accountId,
      row.name,
      row.accountStatus || "(unknown)",
      String(row.rows90d),
      row.rows730d === null ? "" : String(row.rows730d),
      row.rows90d === max90d && max90d > 0 ? "USE ME" : "",
    ]),
  );
  if (rows.length === 0) write("No Facebook ad accounts returned.");
  write();
}

async function reportSheets(userId: string): Promise<void> {
  write("REPORT 2: Sheets round-trip");
  const scenario = await db.scenario.findFirst({
    where: { userId, name: SHEET_TO_SHEET_NAME },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!scenario) throw new Error(`Missing scenario: ${SHEET_TO_SHEET_NAME}`);

  const target = getSheetTarget(scenario.steps);
  if (target.tabName !== "SmokeMirror") {
    throw new Error(`Expected SmokeMirror destination tab, got ${target.tabName}`);
  }

  const run = await executeAndWait(scenario.id, userId);
  const appendRowCount = rowCountForStep(run.logs, target.stepPosition);
  const destinationRows = await readTabRows(
    userId,
    target.spreadsheetId,
    target.tabName,
  );
  const headerValues = await readValues(
    userId,
    target.spreadsheetId,
    `${target.tabName}!1:1`,
  );
  const headers = headerValues[0] ?? [];
  const missingColumns = REQUIRED_SHEET_COLUMNS.filter(
    (column) => !headers.includes(column),
  );

  write("First 3 destination rows:");
  printTable(
    ["row", ...REQUIRED_SHEET_COLUMNS],
    destinationRows.slice(0, 3).map((row) => [
      formatCell(row.row),
      ...REQUIRED_SHEET_COLUMNS.map((column) => formatCell(row[column])),
    ]),
  );
  write("Structured report:");
  write(JSON.stringify(
    {
      scenarioId: scenario.id,
      runId: run.id,
      status: run.status,
      durationMs: run.durationMs,
      stepRowCounts: completedStepRowCounts(run.logs),
      appendRowCount,
      destinationTab: target.tabName,
      destinationRows: destinationRows.length,
      destinationRowsEqualRunRowCount: destinationRows.length === appendRowCount,
      destinationRowsAtLeastRunRowCount: destinationRows.length >= appendRowCount,
      requiredColumnsPresent: missingColumns.length === 0,
      missingColumns,
      errorMessage: run.errorMessage,
    },
    null,
    2,
  ));
  write();
}

async function reportBitrix(userId: string): Promise<void> {
  write("REPORT 3: Bitrix round-trip");
  const scenario = await db.scenario.findFirst({
    where: { userId, name: SHEET_TO_BITRIX_NAME },
  });
  if (!scenario) throw new Error(`Missing scenario: ${SHEET_TO_BITRIX_NAME}`);

  const successfulRunsBefore = await db.run.count({
    where: { scenarioId: scenario.id, status: "SUCCESS" },
  });
  const run = await executeAndWait(scenario.id, userId);
  if (run.status !== "SUCCESS") {
    throw new Error(`Bitrix scenario failed: ${run.errorMessage ?? run.id}`);
  }

  const leads = await callBitrix<BitrixLead[]>(userId, "crm.lead.list", {
    order: { ID: "DESC" },
    filter: { SOURCE_ID: "WEB" },
    select: [
      "ID",
      "TITLE",
      "NAME",
      "EMAIL",
      "COMMENTS",
      "SOURCE_ID",
      "DATE_CREATE",
    ],
    start: 0,
  });
  const newest = leads.slice(0, 4);
  const validations = newest.map(leadValidation);

  write("Newest 4 WEB leads:");
  printTable(
    ["ID", "TITLE", "NAME", "EMAIL", "valid", "issues"],
    validations.map((lead) => [
      lead.id,
      lead.title,
      lead.name,
      lead.email,
      lead.valid ? "yes" : "no",
      lead.issues,
    ]),
  );
  write("Structured report:");
  write(JSON.stringify(
    {
      scenarioId: scenario.id,
      runId: run.id,
      status: run.status,
      durationMs: run.durationMs,
      successfulRunsBefore,
      successfulRunsAfter: await db.run.count({
        where: { scenarioId: scenario.id, status: "SUCCESS" },
      }),
      stepRowCounts: completedStepRowCounts(run.logs),
      newestLeadCountChecked: newest.length,
      allNewestLeadsValid: validations.every((lead) => lead.valid),
      leads: validations,
    },
    null,
    2,
  ));
  write();
}

async function main(): Promise<void> {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  write(`Resolved user: ${USER_EMAIL} -> ${user.id}`);
  write();

  await reportFacebook(user.id);
  await reportSheets(user.id);
  await reportBitrix(user.id);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
