import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "~/server/db";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { executeRun } from "~/server/core/executor";
import type { Scenario as MockScenario } from "~/server/mocks/types";

// ── Zod schemas ───────────────────────────────────────────────────────────────

// Must mirror ModuleType in src/server/mocks/types.ts. Phase 3 widens the API
// contract so new modules can be saved through scenarios.create / scenarios.update.
export const ModuleTypeSchema = z.enum([
  "trigger.schedule",
  "trigger.manual",
  "trigger.watch.sheets_new_rows",
  "trigger.watch.bitrix_new_lead",
  "fb.account_insights",
  "fb.campaign_insights",
  "fb.ad_insights",
  "fb.list_ad_accounts",
  "fb.list_ads",
  "fb.get_ad",
  "sheets.append",
  "sheets.upsert",
  "sheets.find_rows",
  "sheets.update_row",
  "sheets.delete_row",
  "sheets.get_row",
  "sheets.create_tab",
  "sheets.watch_new_rows",
  "bitrix.create_lead",
  "bitrix.update_lead",
  "bitrix.find_leads",
  "bitrix.create_deal",
  "bitrix.update_deal",
  "bitrix.create_smart_process_item",
]);

export const ScenarioStepInput = z.object({
  id: z.string().optional(),
  position: z.number().int().min(1),
  moduleType: ModuleTypeSchema,
  config: z.record(z.string(), z.unknown()),
});

// ── Prisma query helper types ─────────────────────────────────────────────────

type ScenarioWithSteps = Prisma.ScenarioGetPayload<{
  include: { steps: { orderBy: { position: "asc" } } };
}>;

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeStatus(
  status: string | null | undefined,
): "success" | "failed" | null {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "failed";
  return null;
}

function scenarioToFrontend(s: ScenarioWithSteps): MockScenario {
  return {
    id: s.id,
    userId: s.userId,
    name: s.name,
    kind: s.kind,
    enabled: s.enabled,
    steps: s.steps.map((step) => ({
      id: step.id,
      scenarioId: step.scenarioId,
      position: step.position,
      // moduleType is stored as string in DB; cast at this boundary is acceptable
      moduleType: step.moduleType as MockScenario["steps"][number]["moduleType"],
      config: step.config as Record<string, unknown>,
    })),
    lastRunAt: s.lastRunAt,
    lastRunStatus: normalizeStatus(s.lastRunStatus),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}


/**
 * Validates that sheets steps reference an upstream FB step.
 * Returns a warning string if mapping looks wrong, or null if OK.
 */
function validateFieldMappings(
  steps: z.infer<typeof ScenarioStepInput>[],
): string | null {
  const hasFbStep = steps.some((s) => s.moduleType.startsWith("fb."));
  const hasSheetsStep = steps.some((s) => s.moduleType.startsWith("sheets."));
  if (hasSheetsStep && !hasFbStep) {
    return "Sheets step has no upstream Facebook data step — it will write 0 rows.";
  }
  return null;
}

/** Cast config to Prisma's InputJsonValue. One boundary cast is acceptable. */
function toJsonInput(config: Record<string, unknown>): Prisma.InputJsonValue {
  return config as Prisma.InputJsonValue;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const scenariosRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({ includeQuickSetup: z.boolean().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.userId;
      const scenarios = await db.scenario.findMany({
        where: { userId },
        include: { steps: { orderBy: { position: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
      return scenarios.map(scenarioToFrontend);
    }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const scenario = await db.scenario.findUnique({
        where: { id: input.id },
        include: { steps: { orderBy: { position: "asc" } } },
      });
      if (scenario?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }
      return scenarioToFrontend(scenario);
    }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        enabled: z.boolean().default(false),
        adAccountId: z.string().optional(),
        kind: z.enum(["QUICK_SETUP", "CUSTOM"]).default("CUSTOM"),
        steps: z.array(ScenarioStepInput).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      // Log validation warning but return Scenario directly for UI compat
      validateFieldMappings(input.steps);

      const scenario = await db.scenario.create({
        data: {
          userId,
          name: input.name,
          enabled: input.enabled,
          kind: input.kind,
          adAccountId: input.adAccountId ?? null,
          steps: {
            create: input.steps.map((s) => ({
              position: s.position,
              moduleType: s.moduleType,
              config: toJsonInput(s.config),
            })),
          },
        },
        include: { steps: { orderBy: { position: "asc" } } },
      });

      return scenarioToFrontend(scenario);
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(120).optional(),
          enabled: z.boolean().optional(),
          steps: z.array(ScenarioStepInput).optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      const existing = await db.scenario.findUnique({ where: { id: input.id } });
      if (existing?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }

      if (input.data.steps) {
        validateFieldMappings(input.data.steps);
        // Replace steps: deleteMany + recreate
        await db.scenarioStep.deleteMany({ where: { scenarioId: input.id } });
        await db.scenarioStep.createMany({
          data: input.data.steps.map((s) => ({
            scenarioId: input.id,
            position: s.position,
            moduleType: s.moduleType,
            config: toJsonInput(s.config),
          })),
        });
      }

      const scenario = await db.scenario.update({
        where: { id: input.id },
        data: {
          ...(input.data.name !== undefined && { name: input.data.name }),
          ...(input.data.enabled !== undefined && { enabled: input.data.enabled }),
        },
        include: { steps: { orderBy: { position: "asc" } } },
      });

      return scenarioToFrontend(scenario);
    }),

  toggleEnabled: authedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.scenario.findUnique({ where: { id: input.id } });
      if (existing?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }
      await db.scenario.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
      return { id: input.id, enabled: input.enabled };
    }),

  runNow: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.scenario.findUnique({ where: { id: input.id } });
      if (existing?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }
      const runId = await executeRun(input.id, "MANUAL", userId);
      // Expose both `id` and `runId` for UI compat:
      // Phase 1 UI calls `run.id`; Phase 2 callers can use `runId`.
      return { id: runId, runId };
    }),

  testRun: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.scenario.findUnique({ where: { id: input.id } });
      if (existing?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }
      const runId = await executeRun(input.id, "MANUAL", userId);
      const logs = await db.runLog.findMany({
        where: { runId },
        orderBy: { ts: "asc" },
      });

      // Pair start/complete logs into per-step results
      const stepResults: Array<{
        stepId: string;
        status: "success" | "failed";
        durationMs: number;
        output: { rowCount: number };
      }> = [];

      const seenSteps = new Set<string>();
      for (const log of logs) {
        if (log.level === "ERROR") continue;
        const meta = log.meta as Record<string, unknown> | null;
        const stepId = meta?.stepId as string | undefined;
        if (!stepId || seenSteps.has(stepId)) continue;
        if (log.message.startsWith("Completed")) {
          seenSteps.add(stepId);
          stepResults.push({
            stepId,
            status: "success",
            durationMs: (meta?.durationMs as number | undefined) ?? 0,
            output: { rowCount: (meta?.rowCount as number | undefined) ?? 0 },
          });
        }
      }

      const run = await db.run.findUnique({ where: { id: runId } });
      if (run?.status === "FAILED") {
        const steps = await db.scenarioStep.findMany({
          where: { scenarioId: input.id },
          orderBy: { position: "asc" },
        });
        for (const step of steps) {
          if (!seenSteps.has(step.id)) {
            stepResults.push({
              stepId: step.id,
              status: "failed",
              durationMs: 0,
              output: { rowCount: 0 },
            });
          }
        }
      }

      return stepResults;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.scenario.findUnique({ where: { id: input.id } });
      if (existing?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }
      await db.scenario.delete({ where: { id: input.id } });
      return { success: true as const, id: input.id };
    }),

  duplicate: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const source = await db.scenario.findUnique({
        where: { id: input.id },
        include: { steps: { orderBy: { position: "asc" } } },
      });
      if (source?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Scenario ${input.id} not found` });
      }

      const duplicate = await db.scenario.create({
        data: {
          userId,
          name: `${source.name} (copy)`,
          kind: "CUSTOM",
          enabled: false,
          adAccountId: source.adAccountId,
          steps: {
            create: source.steps.map((s) => ({
              position: s.position,
              moduleType: s.moduleType,
              config: s.config as Prisma.InputJsonValue,
            })),
          },
        },
        include: { steps: { orderBy: { position: "asc" } } },
      });

      return scenarioToFrontend(duplicate);
    }),

  runCounts: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const scenarios = await db.scenario.findMany({
      where: { userId },
      select: { id: true, _count: { select: { runs: true } } },
    });
    const counts: Record<string, number> = {};
    for (const s of scenarios) {
      counts[s.id] = s._count.runs;
    }
    return counts;
  }),
});
