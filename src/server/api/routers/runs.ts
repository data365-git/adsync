import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "~/server/db";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";
import type { Run as MockRun } from "~/server/mocks/types";
import { executeRun } from "~/server/core/executor";

// ── Normalizer ────────────────────────────────────────────────────────────────

// The shape returned by the enriched list/getById queries.
// `scenario` is always present (FK) but typed nullable to survive the cast.
type DbRunWithLabels = {
  id: string;
  userId: string;
  scenarioId: string;
  trigger: "MANUAL" | "SCHEDULED";
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: Date;
  finishedAt: Date | null;
  campaignRowsWritten: number;
  adRowsWritten: number;
  durationMs: number | null;
  errorMessage: string | null;
  sheetsUrl: string | null;
  scenario: {
    name: string;
    kind: "QUICK_SETUP" | "CUSTOM";
  } | null;
};

function normalizeRun(r: DbRunWithLabels): MockRun {
  return {
    id: r.id,
    userId: r.userId,
    adAccountId: "",
    scenarioId: r.scenarioId,
    trigger: r.trigger.toLowerCase() as MockRun["trigger"],
    status: r.status.toLowerCase() as MockRun["status"],
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    campaignRowsWritten: r.campaignRowsWritten,
    adRowsWritten: r.adRowsWritten,
    durationMs: r.durationMs,
    errorMessage: r.errorMessage,
    sheetsUrl: r.sheetsUrl,
    scenarioName: r.scenario?.name ?? null,
    scenarioKind: r.scenario?.kind ?? null,
    adAccountLabel: null,
    adAccountFbId: null,
  };
}

// ── Input schemas ─────────────────────────────────────────────────────────────

const StatusSchema = z.enum(["queued", "running", "success", "failed"]);
const FilterStatusSchema = z.enum([
  "queued",
  "running",
  "success",
  "failed",
  "cancelled",
]);

const ListInputSchema = z.object({
  statuses: z.array(StatusSchema).optional(),
  scenarioIds: z.array(z.string()).optional(),
  status: FilterStatusSchema.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  minDurationMs: z.number().int().nonnegative().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export type RunsListResult = {
  runs: MockRun[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function getPositionFromMeta(meta: unknown): number | undefined {
  if (typeof meta !== "object" || meta === null || !("position" in meta)) {
    return undefined;
  }
  const position = (meta as Record<string, unknown>).position;
  return typeof position === "number" ? position : undefined;
}

type RunStepResult = {
  position: number;
  moduleType: string;
  sampleRows: Array<Record<string, unknown>>;
  outputSchema: string[];
  rowCount: number;
  durationMs: number | null;
  status: "success" | "failed" | "running" | "skipped";
};

type RunDiffStep = {
  position: number;
  moduleType: string;
  sampleRows: Array<Record<string, unknown>>;
  durationMs: number | null;
};

type StepForResult = {
  position: number;
  moduleType: string;
};

type LogForResult = {
  message: string;
  meta: unknown;
};

function getMetaRecord(meta: unknown): Record<string, unknown> {
  return typeof meta === "object" && meta !== null
    ? (meta as Record<string, unknown>)
    : {};
}

function getRecordRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null && !Array.isArray(row),
  );
}

function getOutputSchema(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((column): column is string => typeof column === "string")
    : [];
}

function buildRunStepResults(
  steps: StepForResult[],
  logsByPosition: Record<number, LogForResult[]>,
  failedPosition: number | undefined,
): RunStepResult[] {
  return steps.map((step) => {
    const logs = logsByPosition[step.position] ?? [];
    const completedLog = logs.find((log) =>
      log.message.startsWith("Completed step"),
    );
    const meta = getMetaRecord(completedLog?.meta);
    const sampleRows = getRecordRows(meta.sampleRows);
    const explicitOutputSchema = getOutputSchema(meta.outputSchema);
    const outputSchema =
      explicitOutputSchema.length > 0
        ? explicitOutputSchema
        : Object.keys(sampleRows[0] ?? {});
    const rowCount =
      typeof meta.rowCount === "number" ? meta.rowCount : sampleRows.length;
    const durationMs =
      typeof meta.durationMs === "number" ? meta.durationMs : null;
    const status =
      failedPosition === step.position
        ? "failed"
        : completedLog
          ? "success"
          : logs.some((log) => log.message.startsWith("Starting step"))
            ? "running"
            : "skipped";

    return {
      position: step.position,
      moduleType: step.moduleType,
      sampleRows,
      outputSchema,
      rowCount,
      durationMs,
      status,
    };
  });
}

function buildRunDiffSteps(
  steps: StepForResult[],
  logsByPosition: Record<number, LogForResult[]>,
): RunDiffStep[] {
  return steps.map((step) => {
    const completedLog = (logsByPosition[step.position] ?? []).find((log) =>
      log.message.startsWith("Completed step"),
    );
    const meta = getMetaRecord(completedLog?.meta);

    return {
      position: step.position,
      moduleType: step.moduleType,
      sampleRows: getRecordRows(meta.sampleRows),
      durationMs: typeof meta.durationMs === "number" ? meta.durationMs : null,
    };
  });
}

function groupLogsByPosition<T extends LogForResult>(
  logs: T[],
): Record<number, T[]> {
  const logsByPosition: Record<number, T[]> = {};
  for (const log of logs) {
    const position = getPositionFromMeta(log.meta);
    if (position !== undefined) {
      (logsByPosition[position] ??= []).push(log);
    }
  }
  return logsByPosition;
}

function toOverrideRows(payload: unknown): unknown[] {
  return Array.isArray(payload) ? payload : [payload];
}

function getFailedPosition(
  runStatus: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED",
  logs: LogForResult[],
): number | undefined {
  if (runStatus !== "FAILED") return undefined;
  const positions = logs
    .map((log) => getPositionFromMeta(log.meta))
    .filter((position): position is number => position !== undefined);
  return positions.length > 0 ? Math.max(...positions) : undefined;
}

function startOfHour(date: Date): Date {
  const bucket = new Date(date);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket;
}

function startOfDay(date: Date): Date {
  const bucket = new Date(date);
  bucket.setUTCHours(0, 0, 0, 0);
  return bucket;
}

function getDurationFromMeta(meta: unknown): number | undefined {
  const record = getMetaRecord(meta);
  return typeof record.durationMs === "number" ? record.durationMs : undefined;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const runsRouter = createTRPCRouter({
  list: authedProcedure
    .input(ListInputSchema.optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const opts = input ?? { page: 1, pageSize: 10 };

      // Build DB status filter — UI sends lowercase, DB stores uppercase
      const statusValues = [
        ...(opts.statuses ?? []),
        ...(opts.status ? [opts.status] : []),
      ].filter((status) => status !== "cancelled");
      const dbStatuses = statusValues.map(
        (s) => s.toUpperCase() as "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED",
      );
      const onlyCancelled =
        statusValues.length === 0 && opts.status === "cancelled";

      const scenarioIds = opts.scenarioIds;

      const where: Prisma.RunWhereInput = {
        userId,
        ...(onlyCancelled && { id: "__cancelled_runs_are_not_persisted__" }),
        ...(dbStatuses.length > 0 && { status: { in: dbStatuses } }),
        ...(scenarioIds && scenarioIds.length > 0 && { scenarioId: { in: scenarioIds } }),
        ...((opts.from ?? opts.to) && {
          startedAt: {
            ...(opts.from && { gte: opts.from }),
            ...(opts.to && { lte: opts.to }),
          },
        }),
        ...(opts.minDurationMs !== undefined && {
          durationMs: { gte: opts.minDurationMs },
        }),
      };

      const [total, runs] = await Promise.all([
        db.run.count({ where }),
        db.run.findMany({
          where,
          orderBy: { startedAt: "desc" },
          skip: (opts.page - 1) * opts.pageSize,
          take: opts.pageSize,
          include: {
            scenario: {
              select: {
                name: true,
                kind: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));

      return {
        runs: runs.map(normalizeRun),
        total,
        page: opts.page,
        pageSize: opts.pageSize,
        totalPages,
      } satisfies RunsListResult;
    }),

  activity: authedProcedure
    .input(z.object({ hours: z.number().int().min(1).max(168).default(24) }))
    .query(async ({ input, ctx }) => {
      const now = new Date();
      const firstBucket = startOfHour(
        new Date(now.getTime() - (input.hours - 1) * 60 * 60 * 1000),
      );
      const buckets = new Map<
        string,
        { hour: string; success: number; failed: number; running: number }
      >();

      for (let index = 0; index < input.hours; index += 1) {
        const hour = new Date(firstBucket.getTime() + index * 60 * 60 * 1000);
        buckets.set(hour.toISOString(), {
          hour: hour.toISOString(),
          success: 0,
          failed: 0,
          running: 0,
        });
      }

      const runs = await db.run.findMany({
        where: { userId: ctx.userId, startedAt: { gte: firstBucket } },
        select: { startedAt: true, status: true },
      });

      for (const run of runs) {
        const bucket = buckets.get(startOfHour(run.startedAt).toISOString());
        if (!bucket) continue;
        if (run.status === "SUCCESS") bucket.success += 1;
        if (run.status === "FAILED") bucket.failed += 1;
        if (run.status === "RUNNING" || run.status === "QUEUED") {
          bucket.running += 1;
        }
      }

      return Array.from(buckets.values());
    }),

  performanceSummary: authedProcedure
    .input(z.object({ scenarioId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const scenarioFilter = input?.scenarioId
        ? { scenarioId: input.scenarioId }
        : {};
      const recentRuns = await db.run.findMany({
        where: { userId: ctx.userId, ...scenarioFilter },
        orderBy: { startedAt: "desc" },
        take: 100,
        select: {
          durationMs: true,
          startedAt: true,
          scenario: {
            select: {
              steps: { select: { position: true, moduleType: true } },
            },
          },
          logs: {
            where: { message: { startsWith: "Completed step" } },
            select: { meta: true },
          },
        },
      });

      const stepDurations = new Map<
        string,
        { position: number; moduleType: string; values: number[] }
      >();

      for (const run of recentRuns) {
        const moduleByPosition = new Map(
          run.scenario.steps.map((step) => [step.position, step.moduleType]),
        );
        for (const log of run.logs) {
          const position = getPositionFromMeta(log.meta);
          const durationMs = getDurationFromMeta(log.meta);
          if (position === undefined || durationMs === undefined) continue;
          const moduleType = moduleByPosition.get(position) ?? "unknown";
          const key = `${position}:${moduleType}`;
          const bucket =
            stepDurations.get(key) ?? { position, moduleType, values: [] };
          bucket.values.push(durationMs);
          stepDurations.set(key, bucket);
        }
      }

      const slowestStep = Array.from(stepDurations.values())
        .map((step) => ({
          position: step.position,
          moduleType: step.moduleType,
          p95Ms: percentile(step.values, 95),
        }))
        .sort((a, b) => b.p95Ms - a.p95Ms)[0] ?? {
        position: 0,
        moduleType: "none",
        p95Ms: 0,
      };

      const today = startOfDay(new Date());
      const daily = new Map<string, number[]>();
      for (let index = 6; index >= 0; index -= 1) {
        const day = new Date(today.getTime() - index * 24 * 60 * 60 * 1000);
        daily.set(day.toISOString(), []);
      }
      for (const run of recentRuns) {
        if (run.durationMs === null) continue;
        daily.get(startOfDay(run.startedAt).toISOString())?.push(run.durationMs);
      }

      return {
        slowestStep,
        avgPerDay: Array.from(daily.entries()).map(([day, values]) => ({
          day,
          ms:
            values.length === 0
              ? 0
              : Math.round(
                  values.reduce((sum, value) => sum + value, 0) / values.length,
                ),
        })),
      };
    }),

  logs: authedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input, ctx }) => {
      const run = await db.run.findUnique({
        where: { id: input.runId },
        select: { userId: true },
      });
      if (run?.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }
      return db.runLog.findMany({
        where: { runId: input.runId },
        orderBy: { ts: "asc" },
      });
    }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const run = await db.run.findUnique({
        where: { id: input.id },
        include: {
          scenario: {
            select: {
              steps: { orderBy: { position: "asc" } },
              name: true,
              kind: true,
            },
          },
          logs: { orderBy: { ts: "asc" } },
        },
      });
      if (run?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Run ${input.id} not found` });
      }

      const logsByPosition: Record<number, typeof run.logs> = {};
      for (const log of run.logs) {
        const position = getPositionFromMeta(log.meta);
        if (position !== undefined) {
          (logsByPosition[position] ??= []).push(log);
        }
      }

      return {
        ...normalizeRun(run),
        steps: buildRunStepResults(
          run.scenario?.steps ?? [],
          logsByPosition,
          getFailedPosition(run.status, run.logs),
        ),
      };
    }),

  getDetail: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const run = await db.run.findUnique({
        where: { id: input.id },
        include: {
          scenario: { include: { steps: { orderBy: { position: "asc" } } } },
          logs: { orderBy: { ts: "asc" } },
        },
      });

      if (run?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }

      const stepsByPosition: Record<
        number,
        (typeof run.scenario.steps)[number]
      > = {};
      for (const step of run.scenario.steps) {
        stepsByPosition[step.position] = step;
      }

      const logsByPosition: Record<number, typeof run.logs> = {};
      for (const log of run.logs) {
        const position = getPositionFromMeta(log.meta);
        if (position !== undefined) {
          (logsByPosition[position] ??= []).push(log);
        }
      }

      return {
        run,
        scenario: run.scenario,
        logsByPosition,
        stepsByPosition,
        steps: buildRunStepResults(
          run.scenario.steps,
          logsByPosition,
          getFailedPosition(run.status, run.logs),
        ),
      };
    }),

  rerunFromStep: authedProcedure
    .input(
      z.object({
        runId: z.string(),
        position: z.number().int().positive(),
        overridePayload: z.unknown().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const source = await db.run.findUnique({
        where: { id: input.runId },
        include: { scenario: { include: { steps: true } } },
      });

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }

      if (source.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your run." });
      }

      const step = source.scenario.steps.find(
        (candidate) => candidate.position === input.position,
      );

      if (!step) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "position out of range",
        });
      }

      const options =
        input.overridePayload === undefined
          ? {
              rerunOf: source.id,
              rerunFromPosition: input.position,
            }
          : {
              rerunFromPosition: input.position,
              seedOutputs: [
                [input.position - 1, toOverrideRows(input.overridePayload)],
              ] satisfies Array<[number, unknown[]]>,
            };

      const runId = await executeRun(source.scenarioId, "MANUAL", userId, {
        ...options,
      });

      return { runId };
    }),

  compareWithLastSuccess: authedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input, ctx }) => {
      const current = await db.run.findUnique({
        where: { id: input.runId },
        include: {
          scenario: {
            select: {
              steps: {
                orderBy: { position: "asc" },
                select: { position: true, moduleType: true },
              },
            },
          },
          logs: {
            orderBy: { ts: "asc" },
            select: { message: true, meta: true },
          },
        },
      });

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }

      if (current.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your run." });
      }

      const baseline = await db.run.findFirst({
        where: {
          userId: ctx.userId,
          scenarioId: current.scenarioId,
          status: "SUCCESS",
          id: { not: current.id },
          startedAt: { lt: current.startedAt },
        },
        orderBy: { startedAt: "desc" },
        include: {
          scenario: {
            select: {
              steps: {
                orderBy: { position: "asc" },
                select: { position: true, moduleType: true },
              },
            },
          },
          logs: {
            orderBy: { ts: "asc" },
            select: { message: true, meta: true },
          },
        },
      });

      if (!baseline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No prior successful run found.",
        });
      }

      return {
        baseline: {
          runId: baseline.id,
          steps: buildRunDiffSteps(
            baseline.scenario.steps,
            groupLogsByPosition(baseline.logs),
          ),
        },
        current: {
          steps: buildRunDiffSteps(
            current.scenario.steps,
            groupLogsByPosition(current.logs),
          ),
        },
      };
    }),

  retry: authedProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const original = await db.run.findUnique({
        where: { id: input.runId },
        select: { scenarioId: true, userId: true },
      });

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      }
      if (original.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your run." });
      }

      const runId = await executeRun(
        original.scenarioId,
        "MANUAL",
        ctx.userId,
      );

      return { runId };
    }),
});
