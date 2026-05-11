/**
 * Core run executor.
 *
 * executeRun() orchestrates a full scenario run:
 *   1. Load scenario + ordered steps from DB
 *   2. Create a Run row with status RUNNING
 *   3. Execute each step via the module handler registry
 *   4. Persist SUCCESS or FAILED + totals to the Run row
 *   5. Update Scenario.lastRunAt / lastRunStatus
 *
 * NEVER throws — all errors are caught, persisted, and the run.id is returned.
 */

import { db } from "~/server/db";
import { RunContext } from "./run-context";
import { getHandler } from "./module-handlers";

export async function executeRun(
  scenarioId: string,
  trigger: "MANUAL" | "SCHEDULED",
  userId: string,
): Promise<string> {
  // ── 1. Load scenario + steps ───────────────────────────────────────────────
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });

  if (!scenario) {
    // Create a stub failed run so callers always get a runId back
    const failedRun = await db.run.create({
      data: {
        userId,
        scenarioId,
        trigger,
        status: "FAILED",
        finishedAt: new Date(),
        durationMs: 0,
        errorMessage: `Scenario ${scenarioId} not found`,
      },
    });
    return failedRun.id;
  }

  // ── 2. Create RUNNING run row ──────────────────────────────────────────────
  const run = await db.run.create({
    data: {
      userId,
      scenarioId,
      trigger,
      status: "RUNNING",
    },
  });

  const startedAt = Date.now();
  const ctx = new RunContext();
  let campaignRowsWritten = 0;
  let adRowsWritten = 0;
  let sheetsUrl: string | undefined;

  try {
    // ── 3. Execute steps ────────────────────────────────────────────────────
    for (const step of scenario.steps) {
      const stepStart = Date.now();

      await db.runLog.create({
        data: {
          runId: run.id,
          level: "INFO",
          message: `Starting step ${step.position}: ${step.moduleType}`,
          meta: { stepId: step.id, position: step.position },
        },
      });

      const handler = getHandler(step.moduleType);
      const result = await handler(step, ctx, userId);

      const durationMs = Date.now() - stepStart;
      ctx.setMeta(step.position, {
        durationMs,
        rowCount: result.rowCount,
        sheetsUrl: result.sheetsUrl,
      });

      // Accumulate row counts by module type
      if (step.moduleType === "fb.campaign_insights") {
        campaignRowsWritten += result.rowCount;
      } else if (step.moduleType === "fb.ad_insights") {
        adRowsWritten += result.rowCount;
      }

      // Capture sheets URL from any sheets handler
      if (result.sheetsUrl) {
        sheetsUrl = result.sheetsUrl;
      }

      await db.runLog.create({
        data: {
          runId: run.id,
          level: "INFO",
          message: `Completed step ${step.position}: ${step.moduleType}`,
          meta: { stepId: step.id, position: step.position, durationMs, rowCount: result.rowCount },
        },
      });
    }

    // ── 4. Update Run: SUCCESS ───────────────────────────────────────────────
    const totalDurationMs = Date.now() - startedAt;
    await db.run.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        durationMs: totalDurationMs,
        campaignRowsWritten,
        adRowsWritten,
        sheetsUrl: sheetsUrl ?? null,
      },
    });

    // ── 5. Update Scenario ───────────────────────────────────────────────────
    await db.scenario.update({
      where: { id: scenarioId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "SUCCESS",
      },
    });
  } catch (error: unknown) {
    // ── Error path: persist FAILED ───────────────────────────────────────────
    const totalDurationMs = Date.now() - startedAt;
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await db.runLog.create({
      data: {
        runId: run.id,
        level: "ERROR",
        message: errorMessage,
        meta: { stack },
      },
    });

    await db.run.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        durationMs: totalDurationMs,
        errorMessage,
      },
    });

    await db.scenario.update({
      where: { id: scenarioId },
      data: {
        lastRunStatus: "FAILED",
      },
    });
  }

  return run.id;
}
