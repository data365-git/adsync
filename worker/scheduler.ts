/**
 * Scheduler helpers for the worker process.
 *
 * Reads all enabled scenarios with a trigger.schedule step at position 1,
 * computes the next fire time from the stored cron expression, and fires
 * scenarios whose next fire time is <= now.
 *
 * Scheduling approach: setInterval (no node-cron dep needed).
 * node-cron is not in package.json; adding it requires orchestrator approval.
 */

import { db } from "~/server/db";
import { nextFireAt } from "~/lib/cron-builder";
import { executeRun } from "~/server/core/executor";
import { pollAll } from "~/server/sheets/poller";
import { drainSyncJobs, retryFailedJobs } from "~/server/sync/orchestrator";

type ScheduledScenario = {
  id: string;
  name: string;
  userId: string;
  cronExpression: string;
  timezone: string;
  lastRunAt: Date | null;
};

/**
 * Load all enabled scenarios that have a `trigger.schedule` step at position 1.
 */
async function loadScheduledScenarios(): Promise<ScheduledScenario[]> {
  const scenarios = await db.scenario.findMany({
    where: {
      enabled: true,
      steps: {
        some: {
          position: 1,
          moduleType: "trigger.schedule",
        },
      },
    },
    include: {
      steps: { where: { position: 1, moduleType: "trigger.schedule" } },
      user: { select: { id: true, timezone: true } },
    },
  });

  return scenarios.flatMap((s) => {
    const triggerStep = s.steps[0];
    if (!triggerStep) return [];
    const cfg = triggerStep.config as Record<string, unknown>;
    const cronExpression = typeof cfg.cronExpression === "string" ? cfg.cronExpression : null;
    if (!cronExpression) return [];
    return [
      {
        id: s.id,
        name: s.name,
        userId: s.userId,
        cronExpression,
        timezone: s.user?.timezone ?? "UTC",
        lastRunAt: s.lastRunAt,
      },
    ];
  });
}

/**
 * One tick: run all scheduled work in order.
 * Each section is independently guarded — a failure in one does not skip the others.
 */
export async function tick(): Promise<void> {
  const now = new Date();

  // ── 1. Fire due automation scenarios ─────────────────────────────────────
  try {
    const scenarios = await loadScheduledScenarios();
    for (const scenario of scenarios) {
      // nextFireAt signature: (expr: string, _timezone: string, from: Date): Date | null
      const from = scenario.lastRunAt ?? new Date(0);
      const next = nextFireAt(scenario.cronExpression, scenario.timezone, from);

      if (!next || next > now) continue;

      console.log(`[worker] Firing scenario ${scenario.id} (${scenario.name})`);
      executeRun(scenario.id, "SCHEDULED", scenario.userId).catch((err: unknown) => {
        console.error(`[worker] executeRun failed for scenario ${scenario.id}:`, err);
      });
    }
  } catch (err) {
    console.error("[worker] Scenario scheduler error:", err);
  }

  // ── 2–4. Legacy Sheets→Bitrix24 sync pipeline ────────────────────────────
  // This pipeline is single-user (GOOGLE_SHEETS_ID + BITRIX24_WEBHOOK_URL env
  // vars) and writes to un-scoped Lead/Deal/Contact tables. It must NOT run
  // for multi-user deployments. Opt-in explicitly with LEGACY_SYNC_ENABLED=true.
  if (process.env.LEGACY_SYNC_ENABLED === "true") {
    // ── 2. Poll Google Sheets → upsert Postgres → enqueue SyncJobs ─────────
    try {
      await pollAll();
    } catch (err) {
      console.error("[worker] Sheets poll error:", err);
    }

    // ── 3. Drain pending SyncJobs → push to Bitrix24 ───────────────────────
    try {
      const { processed, failed } = await drainSyncJobs();
      if (processed > 0 || failed > 0) {
        console.log(`[worker] SyncJob drain: processed=${processed} failed=${failed}`);
      }
    } catch (err) {
      console.error("[worker] SyncJob drain error:", err);
    }

    // ── 4. Re-queue failed jobs that are past their backoff window ──────────
    try {
      const retried = await retryFailedJobs();
      if (retried > 0) {
        console.log(`[worker] Retried ${retried} failed SyncJobs`);
      }
    } catch (err) {
      console.error("[worker] SyncJob retry error:", err);
    }
  }
}
