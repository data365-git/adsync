/**
 * AdAccounts tRPC router — Phase 2 real-DB implementation.
 *
 * NOTE: authedProcedure is provided by Agent A post-merge.
 * Using publicProcedure as stand-in until then.
 *
 * Decision — adAccounts.runNow when no QUICK_SETUP scenario exists:
 *   We throw "No quick-setup scenario for this account — create one first"
 *   rather than synthesizing a transient run. Rationale: a transient run with
 *   a synthetic scenarioId would violate the FK constraint on Run.scenarioId,
 *   and creating a stub scenario silently is confusing. The UI should guide the
 *   user to create a scenario first. This is the "less magic" path.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "~/server/db";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { executeRun } from "~/server/core/executor";
import type { AdAccount as MockAdAccount } from "~/server/mocks/types";

// merge-time: swap publicProcedure for authedProcedure from "~/server/api/trpc"
const authedProcedure = publicProcedure;

// ── Zod schemas ───────────────────────────────────────────────────────────────

const LevelSchema = z.enum(["CAMPAIGN", "AD"]);

const AdAccountInputSchema = z.object({
  label: z.string().min(1).max(60),
  fbAccountId: z.string().min(1),
  enabled: z.boolean(),
  levels: z.array(LevelSchema).min(1),
  metrics: z.array(z.string()).min(1),
  dateWindowDays: z.number().int().min(1).max(30),
  spreadsheetId: z.string().min(1),
  campaignTabName: z.string().min(1),
  adTabName: z.string().min(1),
  cronExpression: z.string(),
  timezone: z.string().min(1),
});

// ── Normalizer ────────────────────────────────────────────────────────────────

type DbAdAccount = Awaited<ReturnType<typeof db.adAccount.findUniqueOrThrow>>;

function normalizeAdAccount(
  a: DbAdAccount,
  lastRunStatus?: string | null,
): MockAdAccount {
  return {
    id: a.id,
    userId: a.userId,
    label: a.label,
    fbAccountId: a.fbAccountId,
    enabled: a.enabled,
    levels: a.levels,
    metrics: a.metrics,
    dateWindowDays: a.dateWindowDays,
    spreadsheetId: a.spreadsheetId,
    campaignTabName: a.campaignTabName,
    adTabName: a.adTabName,
    cronExpression: a.cronExpression,
    timezone: a.timezone,
    lastRunAt: null,
    lastRunStatus:
      lastRunStatus === "SUCCESS"
        ? "success"
        : lastRunStatus === "FAILED"
          ? "failed"
          : null,
    createdAt: a.createdAt,
  };
}

async function getLastRunStatus(
  adAccountId: string,
  userId: string,
): Promise<string | null> {
  const scenario = await db.scenario.findFirst({
    where: { adAccountId, userId },
    select: { lastRunStatus: true },
    orderBy: { lastRunAt: "desc" },
  });
  return scenario?.lastRunStatus ?? null;
}

function assertOwned(
  resource: { userId: string } | null,
  userId: string,
  label: string,
): asserts resource is { userId: string } {
  if (resource?.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${label} not found` });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const adAccountsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const userId = (ctx as { userId?: string }).userId ?? "dev";
    const accounts = await db.adAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      accounts.map(async (a) => {
        const status = await getLastRunStatus(a.id, userId);
        return normalizeAdAccount(a, status);
      }),
    );
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";
      const account = await db.adAccount.findUnique({ where: { id: input.id } });
      assertOwned(account, userId, `Ad account ${input.id}`);
      const status = await getLastRunStatus(input.id, userId);
      return normalizeAdAccount(account, status);
    }),

  create: authedProcedure
    .input(AdAccountInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";
      const account = await db.adAccount.create({
        data: {
          userId,
          label: input.label,
          fbAccountId: input.fbAccountId,
          enabled: input.enabled,
          levels: input.levels,
          metrics: input.metrics,
          dateWindowDays: input.dateWindowDays,
          spreadsheetId: input.spreadsheetId,
          campaignTabName: input.campaignTabName,
          adTabName: input.adTabName,
          cronExpression: input.cronExpression,
          timezone: input.timezone,
        },
      });
      return normalizeAdAccount(account, null);
    }),

  update: authedProcedure
    .input(z.object({ id: z.string(), data: AdAccountInputSchema }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";
      const existing = await db.adAccount.findUnique({ where: { id: input.id } });
      assertOwned(existing, userId, `Ad account ${input.id}`);
      const account = await db.adAccount.update({
        where: { id: input.id },
        data: {
          label: input.data.label,
          fbAccountId: input.data.fbAccountId,
          enabled: input.data.enabled,
          levels: input.data.levels,
          metrics: input.data.metrics,
          dateWindowDays: input.data.dateWindowDays,
          spreadsheetId: input.data.spreadsheetId,
          campaignTabName: input.data.campaignTabName,
          adTabName: input.data.adTabName,
          cronExpression: input.data.cronExpression,
          timezone: input.data.timezone,
        },
      });
      const status = await getLastRunStatus(input.id, userId);
      return normalizeAdAccount(account, status);
    }),

  toggleEnabled: authedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";
      const existing = await db.adAccount.findUnique({ where: { id: input.id } });
      assertOwned(existing, userId, `Ad account ${input.id}`);
      await db.adAccount.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
      return { id: input.id, enabled: input.enabled };
    }),

  runNow: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";

      const account = await db.adAccount.findUnique({ where: { id: input.id } });
      assertOwned(account, userId, `Ad account ${input.id}`);

      // Look up a QUICK_SETUP scenario for this ad account
      const scenario = await db.scenario.findFirst({
        where: { adAccountId: input.id, userId, kind: "QUICK_SETUP" },
      });

      if (!scenario) {
        // Throw rather than synthesize a transient run.
        // A transient run would violate the Run.scenarioId FK constraint.
        // The user must create a QUICK_SETUP scenario first.
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No quick-setup scenario for this account — create one first",
        });
      }

      const runId = await executeRun(scenario.id, "MANUAL", userId);
      return { runId, adAccountId: input.id };
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";
      const existing = await db.adAccount.findUnique({ where: { id: input.id } });
      assertOwned(existing, userId, `Ad account ${input.id}`);
      await db.adAccount.delete({ where: { id: input.id } });
      return { success: true as const, id: input.id };
    }),
});
