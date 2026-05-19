import { TRPCError } from "@trpc/server";
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
    adAccount: { label: string; fbAccountId: string } | null;
  } | null;
};

function normalizeRun(r: DbRunWithLabels): MockRun {
  return {
    id: r.id,
    userId: r.userId,
    // adAccountId is not on the Phase 2 Run model — keep as '' for type compat
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
    adAccountLabel: r.scenario?.adAccount?.label ?? null,
    adAccountFbId: r.scenario?.adAccount?.fbAccountId ?? null,
  };
}

// ── Input schemas ─────────────────────────────────────────────────────────────

const StatusSchema = z.enum(["queued", "running", "success", "failed"]);

const ListInputSchema = z.object({
  accountIds: z.array(z.string()).optional(),
  statuses: z.array(StatusSchema).optional(),
  scenarioIds: z.array(z.string()).optional(),
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

// ── Router ────────────────────────────────────────────────────────────────────

export const runsRouter = createTRPCRouter({
  list: authedProcedure
    .input(ListInputSchema.optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const opts = input ?? { page: 1, pageSize: 10 };

      // Build DB status filter — UI sends lowercase, DB stores uppercase
      const dbStatuses = opts.statuses?.map((s) => s.toUpperCase() as "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED");

      // scenarioIds filter via accountIds: look up scenarios for those accounts
      let scenarioIds = opts.scenarioIds;
      if (opts.accountIds && opts.accountIds.length > 0 && !scenarioIds) {
        const scenarios = await db.scenario.findMany({
          where: {
            userId,
            adAccountId: { in: opts.accountIds },
          },
          select: { id: true },
        });
        scenarioIds = scenarios.map((s) => s.id);
      }

      const where = {
        userId,
        ...(dbStatuses && dbStatuses.length > 0 && { status: { in: dbStatuses } }),
        ...(scenarioIds && scenarioIds.length > 0 && { scenarioId: { in: scenarioIds } }),
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
                adAccount: { select: { label: true, fbAccountId: true } },
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
              adAccount: { select: { label: true, fbAccountId: true } },
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
    .input(z.object({ runId: z.string(), position: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const source = await db.run.findUnique({
        where: { id: input.runId },
        include: { scenario: { include: { steps: true } } },
      });

      if (source?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }

      if (input.position > source.scenario.steps.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "position out of range",
        });
      }

      const runId = await executeRun(source.scenarioId, "MANUAL", userId, {
        rerunOf: source.id,
        rerunFromPosition: input.position,
      });

      return { runId };
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
