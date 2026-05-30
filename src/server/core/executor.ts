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
import { interpolateWithWarnings } from "./template";
import { notifyOnFailure } from "./notifier";
import { validateStepConfig } from "./validate-config";
import type { HandlerResult } from "./module-handlers";
import type { ScenarioStep } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";

type ExecuteRunOptions = {
  rerunOf?: string;
  rerunFromPosition?: number;
  seedOutputs?: Array<[number, unknown[]]>;
  webhookTriggerPayload?: unknown;
};

function toInputJsonValue(value: unknown): InputJsonValue {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  return parsed as InputJsonValue;
}

function getMetaRecord(meta: unknown): Record<string, unknown> {
  return typeof meta === "object" && meta !== null
    ? (meta as Record<string, unknown>)
    : {};
}

function getMetaPosition(meta: Record<string, unknown>): number | undefined {
  return typeof meta.position === "number" ? meta.position : undefined;
}

function getMetaSampleRows(meta: Record<string, unknown>): unknown[] {
  return Array.isArray(meta.sampleRows) ? meta.sampleRows : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function resolveStepConfig(
  config: unknown,
  upstreamRow: Record<string, unknown>,
): unknown {
  return resolveStepConfigWithWarnings(config, upstreamRow).config;
}

export function resolveStepConfigWithWarnings(
  config: unknown,
  upstreamRow: Record<string, unknown>,
): { config: unknown; warnings: string[] } {
  if (!isPlainObject(config)) return { config, warnings: [] };

  // Only interpolate top-level string fields. Nested objects (e.g.
  // `mappedFields: Record<string, string>` on the sheets handlers) are passed
  // through untouched — the handler is responsible for interpolating them.
  // Recursing here caused a double-interpolation bug: an upstream-missing
  // token resolved to "" at the executor pass, and the handler's empty-expr
  // backwards-compat branch then incorrectly copied the upstream column value.
  const resolved: Record<string, unknown> = {};
  const warnings: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      const result = interpolateWithWarnings(value, upstreamRow);
      resolved[key] = result.value;
      warnings.push(...result.warnings);
    } else {
      resolved[key] = value;
    }
  }
  return { config: resolved, warnings: Array.from(new Set(warnings)) };
}

export function buildRerunSeedOutputs(
  logs: Array<{ meta: unknown }>,
  rerunFromPosition: number,
): Array<[number, unknown[]]> {
  const outputs = new Map<number, unknown[]>();

  for (const log of logs) {
    const meta = getMetaRecord(log.meta);
    const position = getMetaPosition(meta);
    if (position === undefined || position >= rerunFromPosition) continue;

    const sampleRows = getMetaSampleRows(meta);
    if (sampleRows.length > 0) {
      outputs.set(position, sampleRows);
    }
  }

  return Array.from(outputs.entries()).sort(([left], [right]) => left - right);
}

export function buildStepCompleteLogMeta(
  step: Pick<ScenarioStep, "id" | "position">,
  result: HandlerResult,
  durationMs: number,
) {
  const sampleRows = (result.rows ?? [])
    .slice(0, 3)
    .map((row) => toInputJsonValue(row));
  const firstRow = sampleRows[0];
  const outputSchema =
    typeof firstRow === "object" && firstRow !== null
      ? Object.keys(firstRow)
      : [];

  const meta = {
    stepId: step.id,
    position: step.position,
    durationMs,
    rowCount: result.rowCount,
    sampleRows,
    outputSchema,
  };
  if (result.warnings && result.warnings.length > 0) {
    return { ...meta, warnings: result.warnings };
  }
  return meta;
}

export function buildStepStartLogMeta(
  step: Pick<ScenarioStep, "id" | "position" | "config">,
  upstreamRows: unknown[],
) {
  return {
    stepId: step.id,
    position: step.position,
    inputConfig: toInputJsonValue(step.config),
    inputSampleRows: upstreamRows
      .slice(0, 3)
      .map((row) => toInputJsonValue(row)),
  };
}

export async function executeRun(
  scenarioId: string,
  trigger: "MANUAL" | "SCHEDULED",
  userId: string,
  options: ExecuteRunOptions = {},
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
  const campaignRowsWritten = 0;
  const adRowsWritten = 0;
  let sheetsUrl: string | undefined;

  for (const [position, rows] of options.seedOutputs ?? []) {
    ctx.setOutput(position, rows);
  }

  if (options.rerunOf && options.rerunFromPosition !== undefined) {
    const sourceLogs = await db.runLog.findMany({
      where: { runId: options.rerunOf },
      orderBy: { ts: "asc" },
    });
    for (const [position, rows] of buildRerunSeedOutputs(
      sourceLogs,
      options.rerunFromPosition,
    )) {
      ctx.setOutput(position, rows);
    }
  }

  if (options.webhookTriggerPayload !== undefined) {
    ctx.setOutput(1, [options.webhookTriggerPayload]);
  }

  try {
    // ── 2b. Validate the whole scenario up front ─────────────────────────────
    // An incomplete step (missing required field) makes the scenario
    // un-runnable. Fail before executing ANY step — including the trigger — so
    // we never half-run and fail mid-chain. This gate covers every entry point
    // that reaches executeRun: manual, re-run, retry, webhook, and the worker.
    for (const step of scenario.steps) {
      const upfront = validateStepConfig(step.moduleType, step.config);
      if (!upfront.ok) {
        throw new Error(
          `Step ${step.position} (${step.moduleType}): missing required field '${upfront.field}'`,
        );
      }
    }

    // ── 3. Execute steps ────────────────────────────────────────────────────
    for (const step of scenario.steps) {
      if (
        options.rerunFromPosition !== undefined &&
        step.position < options.rerunFromPosition
      ) {
        continue;
      }

      const stepStart = Date.now();
      const upstreamRows = ctx.getUpstreamRows(step.position);
      const upstreamRow0 =
        typeof upstreamRows[0] === "object" && upstreamRows[0] !== null
          ? (upstreamRows[0] as Record<string, unknown>)
          : {};
      const resolved = resolveStepConfigWithWarnings(step.config, upstreamRow0);
      const resolvedConfig = resolved.config;
      const resolvedStep: ScenarioStep = {
        ...step,
        config: toInputJsonValue(resolvedConfig) as ScenarioStep["config"],
      };

      // Validate the RESOLVED config only when there's upstream data to map
      // from. With 0 upstream rows the row-consuming actions (sheets.*, bitrix.*)
      // skip gracefully — validating tokens that resolved against an empty row
      // would be a false "missing required field" failure. Genuinely
      // unconfigured fields are already caught by the up-front raw-config gate.
      if (upstreamRows.length > 0) {
        const validation = validateStepConfig(
          step.moduleType,
          resolvedStep.config,
        );
        if (!validation.ok) {
          throw new Error(
            `Step ${step.position} (${step.moduleType}): missing required field '${validation.field}'`,
          );
        }
      }

      await db.runLog.create({
        data: {
          runId: run.id,
          level: "INFO",
          message: `Starting step ${step.position}: ${step.moduleType}`,
          meta: buildStepStartLogMeta(resolvedStep, upstreamRows),
        },
      });

      const handler = getHandler(step.moduleType);
      const result = await handler(resolvedStep, ctx, userId);
      const resultWithWarnings: HandlerResult = {
        ...result,
        warnings: Array.from(
          new Set([...(result.warnings ?? []), ...resolved.warnings]),
        ),
      };

      const durationMs = Date.now() - stepStart;
      ctx.setMeta(step.position, {
        durationMs,
        rowCount: resultWithWarnings.rowCount,
        sheetsUrl: resultWithWarnings.sheetsUrl,
      });

      // Capture sheets URL from any sheets handler
      if (resultWithWarnings.sheetsUrl) {
        sheetsUrl = resultWithWarnings.sheetsUrl;
      }

      await db.runLog.create({
        data: {
          runId: run.id,
          level: "INFO",
          message:
            resultWithWarnings.message ??
            `Completed step ${step.position}: ${step.moduleType}`,
          meta: buildStepCompleteLogMeta(step, resultWithWarnings, durationMs),
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
    const errorMessage = error instanceof Error ? error.message : String(error);
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

    void notifyOnFailure({
      userId,
      runId: run.id,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      errorMessage,
      durationMs: totalDurationMs,
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
