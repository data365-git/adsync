import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "~/server/db";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";
import type { Run as MockRun } from "~/server/mocks/types";

// ── Normalizer ────────────────────────────────────────────────────────────────

type DbRun = Awaited<ReturnType<typeof db.run.findUniqueOrThrow>>;

function normalizeRun(r: DbRun): MockRun {
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
      const run = await db.run.findUnique({ where: { id: input.id } });
      if (run?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Run ${input.id} not found` });
      }
      return normalizeRun(run);
    }),
});
