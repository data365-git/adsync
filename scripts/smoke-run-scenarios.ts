import { PrismaClient, type Run, type RunLog } from "@prisma/client";

import { executeRun } from "../src/server/core/executor";

const db = new PrismaClient();

const USER_EMAIL = "jumanovsamandar005@gmail.com";
const MANUAL_NAMES = [
  "[SMOKE] Sheet → Bitrix lead",
  "[SMOKE] Sheet → Sheet append",
] as const;
const FB_NAME = "[SMOKE-FB] FB -> Sheet";
const FB_AD_ACCOUNTS_NAME = "[SMOKE-FB] List ad accounts → Sheet";
const FB_DAILY_CAMPAIGNS_NAME = "[SMOKE-FB] Daily campaign metrics → Sheet upsert";
const FB_AD_METRICS_NAME = "[SMOKE-FB] Hourly ad metrics → Sheet upsert";
const FB_SCENARIO_NAMES = [
  FB_NAME,
  FB_AD_ACCOUNTS_NAME,
  FB_DAILY_CAMPAIGNS_NAME,
  FB_AD_METRICS_NAME,
] as const;
const DEFAULT_POLL_TIMEOUT_MS = 60_000;
const FB_POLL_TIMEOUT_MS = 60_000;
const WATCH_NAME = "[SMOKE] Watch new rows → Bitrix lead";

type SmokeResult = {
  scenarioName: string;
  status: string;
  durationMs: number | null;
  rowsWritten: number;
  errorMessage: string;
};

function write(message: string): void {
  process.stdout.write(`${message}\n`);
}

function getMeta(log: RunLog): Record<string, unknown> {
  return typeof log.meta === "object" && log.meta !== null
    ? (log.meta as Record<string, unknown>)
    : {};
}

function rowsWrittenFromLogs(logs: RunLog[]): number {
  let total = 0;
  for (const log of logs) {
    const meta = getMeta(log);
    if (!log.message.startsWith("Completed step")) continue;
    const rowCount = meta.rowCount;
    if (typeof rowCount === "number") total += rowCount;
  }
  return total;
}

async function pollRun(
  runId: string,
  timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
): Promise<Run & { logs: RunLog[] }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await db.run.findUnique({
      where: { id: runId },
      include: { logs: { orderBy: { ts: "asc" } } },
    });
    if (!run) throw new Error(`Run disappeared: ${runId}`);
    if (run.status !== "RUNNING") return run;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Run did not finish within ${timeoutMs / 1_000}s: ${runId}`);
}

function printTable(results: SmokeResult[]): void {
  const headers = ["scenarioName", "status", "durationMs", "rowsWritten", "errorMessage"];
  const rows = results.map((result) => [
    result.scenarioName,
    result.status,
    String(result.durationMs ?? ""),
    String(result.rowsWritten),
    result.errorMessage,
  ]);
  const widths = headers.map((header, idx) =>
    Math.max(header.length, ...rows.map((row) => row[idx]!.length)),
  );
  const format = (row: string[]) =>
    row.map((cell, idx) => cell.padEnd(widths[idx]!)).join(" | ");

  write(format(headers));
  write(widths.map((width) => "-".repeat(width)).join("-|-"));
  for (const row of rows) write(format(row));
}

async function main(): Promise<number> {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  const scenarios = await db.scenario.findMany({
    where: {
      userId: user.id,
      name: { in: [...MANUAL_NAMES, WATCH_NAME, ...FB_SCENARIO_NAMES] },
    },
    include: { steps: true },
  });
  const byName = new Map(scenarios.map((scenario) => [scenario.name, scenario]));

  const results: SmokeResult[] = [];
  for (const name of MANUAL_NAMES) {
    const scenario = byName.get(name);
    if (!scenario) throw new Error(`Missing smoke scenario: ${name}`);

    const runId = await executeRun(scenario.id, "MANUAL", user.id);
    const run = await pollRun(runId);
    results.push({
      scenarioName: scenario.name,
      status: run.status,
      durationMs: run.durationMs,
      rowsWritten: rowsWrittenFromLogs(run.logs),
      errorMessage: run.errorMessage ?? "",
    });
  }

  const watchScenario = byName.get(WATCH_NAME);
  if (!watchScenario) throw new Error(`Missing smoke scenario: ${WATCH_NAME}`);

  const triggerPayload = {
    row: 6,
    id: `smoke-${Date.now()}`,
    name: "Smoke",
    email: "smoke@example.com",
    status: "new",
  };
  const watchRunId = await executeRun(watchScenario.id, "MANUAL", user.id, {
    webhookTriggerPayload: triggerPayload,
    rerunFromPosition: 2,
  });
  const watchRun = await pollRun(watchRunId);
  results.push({
    scenarioName: watchScenario.name,
    status: watchRun.status,
    durationMs: watchRun.durationMs,
    rowsWritten: rowsWrittenFromLogs(watchRun.logs),
    errorMessage: watchRun.errorMessage ?? "",
  });

  for (const name of FB_SCENARIO_NAMES) {
    const fbScenario = byName.get(name);
    if (fbScenario) {
      const fbRunId = await executeRun(fbScenario.id, "MANUAL", user.id);
      const fbRun = await pollRun(fbRunId, FB_POLL_TIMEOUT_MS);
      results.push({
        scenarioName: fbScenario.name,
        status: fbRun.status,
        durationMs: fbRun.durationMs,
        rowsWritten: rowsWrittenFromLogs(fbRun.logs),
        errorMessage: fbRun.errorMessage ?? "",
      });
    } else {
      results.push({
        scenarioName: name,
        status: "SKIPPED",
        durationMs: null,
        rowsWritten: 0,
        errorMessage: "Scenario not seeded",
      });
    }
  }

  printTable(results);
  if (results.some((result) => result.status === "FAILED")) process.exit(1);
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
