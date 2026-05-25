import {
  PrismaClient,
  Prisma,
  Provider,
  ConnectionStatus,
  ScenarioKind,
  RunTrigger,
  RunStatus,
  LogLevel,
} from "@prisma/client";
import {
  MOCK_USER,
  MOCK_CONNECTIONS,
  MOCK_SCENARIOS,
  MOCK_RUNS,
  MOCK_RUN_LOGS,
} from "../src/server/mocks/data";

const db = new PrismaClient();

async function main() {
  // 1. User
  await db.user.upsert({
    where: { email: MOCK_USER.email },
    create: {
      id: MOCK_USER.id,
      email: MOCK_USER.email,
      name: MOCK_USER.name,
      image: MOCK_USER.image,
      allowlisted: MOCK_USER.allowlisted,
      timezone: MOCK_USER.timezone,
      theme: MOCK_USER.theme,
    },
    update: {},
  });

  // 2. OAuthConnections (seeded as DISCONNECTED — user reconnects via real OAuth)
  for (const c of MOCK_CONNECTIONS) {
    const provider: Provider =
      c.provider === "google" ? Provider.GOOGLE_SHEETS : Provider.FACEBOOK;
    await db.oAuthConnection.upsert({
      where: { userId_provider: { userId: MOCK_USER.id, provider } },
      create: {
        id: c.id,
        userId: MOCK_USER.id,
        provider,
        status: ConnectionStatus.DISCONNECTED,
        email: c.email,
        externalId: null,
        accessToken: "PLACEHOLDER_RECONNECT_REQUIRED",
        refreshToken: null,
        expiresAt: null,
      },
      update: {},
    });
  }

  // 4. Scenarios + Steps
  for (const s of MOCK_SCENARIOS) {
    await db.scenario.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        userId: MOCK_USER.id,
        name: s.name,
        kind: s.kind as ScenarioKind,
        enabled: s.enabled,
        lastRunAt: s.lastRunAt,
        lastRunStatus: s.lastRunStatus
          ? (s.lastRunStatus.toUpperCase() as RunStatus)
          : null,
      },
      update: {},
    });
    for (const step of s.steps) {
      await db.scenarioStep.upsert({
        where: {
          scenarioId_position: { scenarioId: s.id, position: step.position },
        },
        create: {
          id: step.id,
          scenarioId: s.id,
          position: step.position,
          moduleType: step.moduleType,
          config: step.config as object,
        },
        update: {},
      });
    }
  }

  // 5. Runs
  for (const r of MOCK_RUNS) {
    await db.run.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        userId: MOCK_USER.id,
        scenarioId: r.scenarioId,
        trigger: r.trigger.toUpperCase() as RunTrigger,
        status: r.status.toUpperCase() as RunStatus,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs: r.durationMs,
        campaignRowsWritten: r.campaignRowsWritten ?? 0,
        adRowsWritten: r.adRowsWritten ?? 0,
        errorMessage: r.errorMessage,
        sheetsUrl: r.sheetsUrl,
      },
      update: {},
    });
  }

  // 6. RunLogs
  for (const l of MOCK_RUN_LOGS) {
    await db.runLog.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        runId: l.runId,
        level: l.level as LogLevel,
        message: l.message,
        meta:
          l.meta === null
            ? Prisma.JsonNull
            : (l.meta as Prisma.InputJsonValue),
        ts: l.timestamp,
      },
      update: {},
    });
  }

  console.log("Seeded: 1 user, 3 ad accounts, 7 scenarios, 30 runs, logs");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
