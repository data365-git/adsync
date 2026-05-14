import { PrismaClient, type RunLog } from "@prisma/client";

import { executeRun } from "../src/server/core/executor";

const db = new PrismaClient();
const SCENARIO_NAME = "Phase A Smoke Test";
const SHEET_ID = process.env.SMOKE_TEST_SHEET_ID;
const shouldClean = process.argv.includes("--clean");

function writeOut(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function formatLog(log: RunLog): string {
  return `[${log.ts.toISOString()}] ${log.level} ${log.message}`;
}

async function findSmokeScenario() {
  return db.scenario.findFirst({ where: { name: SCENARIO_NAME } });
}

async function seedScenario(userId: string, spreadsheetId: string) {
  const existing = await findSmokeScenario();
  if (existing) {
    writeOut(`Reusing scenario: ${existing.id}`);
    return existing;
  }

  const scenario = await db.scenario.create({
    data: {
      name: SCENARIO_NAME,
      userId,
      kind: "CUSTOM",
      enabled: true,
      steps: {
        create: [
          { position: 1, moduleType: "trigger.manual", config: {} },
          { position: 2, moduleType: "fb.list_ad_accounts", config: {} },
          {
            position: 3,
            moduleType: "sheets.find_rows",
            config: {
              spreadsheetId,
              tabName: "Leads",
              searchColumn: "status",
              searchValue: "new",
            },
          },
          {
            position: 4,
            moduleType: "sheets.update_row",
            config: {
              spreadsheetId,
              tabName: "Leads",
              rowIdentifier: "id=42",
              mappedFields: { status: "processed" },
            },
          },
          {
            position: 5,
            moduleType: "bitrix.create_lead",
            config: {
              title: "Smoke test - Alice",
              name: "Alice",
              email: "alice@example.com",
              sourceId: "OTHER",
              comments: "Auto-created by adsync smoke test",
            },
          },
        ],
      },
    },
  });

  writeOut(`Created scenario: ${scenario.id}`);
  return scenario;
}

async function cleanSmokeScenario(): Promise<number> {
  const scenario = await findSmokeScenario();
  if (!scenario) {
    writeOut("Nothing to clean.");
    return 0;
  }

  await db.runLog.deleteMany({ where: { run: { scenarioId: scenario.id } } });
  await db.run.deleteMany({ where: { scenarioId: scenario.id } });
  await db.scenarioStep.deleteMany({ where: { scenarioId: scenario.id } });
  await db.scenario.delete({ where: { id: scenario.id } });

  writeOut("Smoke-test scenario cleaned up.");
  return 0;
}

async function pollRun(runId: string): Promise<number> {
  let printedLogCount = 0;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const current = await db.run.findUnique({
      where: { id: runId },
      include: { logs: { orderBy: { ts: "asc" } } },
    });

    if (!current) {
      writeErr(`Run disappeared: ${runId}`);
      return 1;
    }

    const newLogs = current.logs.slice(printedLogCount);
    for (const log of newLogs) {
      writeOut(formatLog(log));
    }
    printedLogCount = current.logs.length;

    if (current.status === "SUCCESS" || current.status === "FAILED") {
      writeOut(`Run finished: ${current.status}`);
      writeOut(`Run page: http://localhost:3000/runs/${runId}`);
      return current.status === "SUCCESS" ? 0 : 1;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  writeErr(`Run did not complete within 60s. Run id: ${runId}`);
  return 3;
}

async function main(): Promise<number> {
  if (shouldClean) {
    return cleanSmokeScenario();
  }

  if (!SHEET_ID) {
    writeErr("SMOKE_TEST_SHEET_ID env var is required. See docs/SMOKE_TEST.md.");
    return 2;
  }

  const user = await db.user.findFirst();
  if (!user) {
    throw new Error("No user found in DB; sign in via /login first.");
  }

  const scenario = await seedScenario(user.id, SHEET_ID);
  const runId = await executeRun(scenario.id, "MANUAL", user.id);
  writeOut(`Run started: ${runId}`);

  return pollRun(runId);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    writeErr(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
