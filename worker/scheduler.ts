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
 * One tick: fire all due scenarios.
 */
export async function tick(): Promise<void> {
  const now = new Date();
  let scenarios: ScheduledScenario[];

  try {
    scenarios = await loadScheduledScenarios();
  } catch (err) {
    console.error("[worker] Failed to load scheduled scenarios:", err);
    return;
  }

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
}
