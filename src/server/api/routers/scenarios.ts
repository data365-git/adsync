import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "~/server/db";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";
import {
  buildStepCompleteLogMeta,
  buildStepStartLogMeta,
  executeRun,
  resolveStepConfig,
} from "~/server/core/executor";
import { RunContext } from "~/server/core/run-context";
import { getHandler } from "~/server/core/module-handlers";
import type { Scenario as MockScenario } from "~/server/mocks/types";
import type { ScenarioStep } from "@prisma/client";

// ── Zod schemas ───────────────────────────────────────────────────────────────

// Must mirror ModuleType in src/server/mocks/types.ts. Phase 3 widens the API
// contract so new modules can be saved through scenarios.create / scenarios.update.
export const ModuleTypeSchema = z.enum([
  "trigger.schedule",
  "trigger.manual",
  "trigger.webhook",
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
  "bitrix.create_lead",
  "bitrix.update_lead",
  "bitrix.find_leads",
  "bitrix.create_deal",
  "bitrix.update_deal",
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
    folderId: s.folderId ?? null,
    steps: s.steps.map((step) => ({
      id: step.id,
      scenarioId: step.scenarioId,
      position: step.position,
      // moduleType is stored as string in DB; cast at this boundary is acceptable
      moduleType:
        step.moduleType as MockScenario["steps"][number]["moduleType"],
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

function toScenarioStepWithConfig(
  step: ScenarioStep,
  config: unknown,
): ScenarioStep {
  return {
    ...step,
    config: JSON.parse(JSON.stringify(config)) as ScenarioStep["config"],
  };
}

function firstUrl(rows: unknown[]): string | null {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const value of Object.values(row as Record<string, unknown>)) {
      if (typeof value === "string" && /^https?:\/\//i.test(value))
        return value;
    }
  }
  return null;
}

function isWebhookTrigger(
  steps: Array<{ moduleType: string }> | undefined,
): boolean {
  return steps?.[0]?.moduleType === "trigger.webhook";
}

// ── Router ────────────────────────────────────────────────────────────────────

export const scenariosRouter = createTRPCRouter({
  list: authedProcedure
    .input(
      z
        .object({
          includeQuickSetup: z.boolean().optional(),
          folderId: z.string().nullable().optional(),
          q: z.string().optional(),
          scope: z.enum(["this", "all"]).optional(),
          kind: z.enum(["CUSTOM", "QUICK_SETUP"]).optional(),
          enabled: z.boolean().optional(),
          sort: z.enum(["name", "updated", "lastRun"]).optional(),
          dir: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const sort = input?.sort ?? "updated";
      const dir = input?.dir ?? "desc";

      const where: Prisma.ScenarioWhereInput = { userId };

      if (input?.includeQuickSetup === false) {
        where.kind = { in: ["CUSTOM"] };
      }
      if (input?.kind) {
        where.kind = { in: [input.kind] };
      }
      if (input?.enabled !== undefined) {
        where.enabled = input.enabled;
      }

      // Folder scoping
      if (input?.scope === "all") {
        // Global search — no folder restriction
      } else if (input?.folderId !== undefined) {
        where.folderId = input.folderId; // null = root, string = specific folder
      }

      // Search filter
      if (input?.q) {
        const terms = input.q.trim().split(/\s+/).filter(Boolean);
        if (terms.length > 0) {
          where.AND = terms.map((term) => ({
            name: { contains: term, mode: "insensitive" as const },
          }));
        }
      }

      const orderBy: Record<string, string> = {};
      if (sort === "name") orderBy.name = dir;
      else if (sort === "lastRun") orderBy.lastRunAt = dir;
      else orderBy.updatedAt = dir;

      const scenarios = await db.scenario.findMany({
        where,
        include: { steps: { orderBy: { position: "asc" } } },
        orderBy,
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
      }
      return scenarioToFrontend(scenario);
    }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        enabled: z.boolean().default(false),
        adAccountId: z.string().optional(),
        folderId: z.string().nullable().optional(),
        kind: z.enum(["QUICK_SETUP", "CUSTOM"]).default("CUSTOM"),
        steps: z.array(ScenarioStepInput).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      // Log validation warning but return Scenario directly for UI compat
      validateFieldMappings(input.steps);
      const webhookSecret = isWebhookTrigger(input.steps)
        ? randomBytes(32).toString("hex")
        : null;

      const scenario = await db.scenario.create({
        data: {
          userId,
          name: input.name,
          enabled: input.enabled,
          kind: input.kind,
          adAccountId: input.adAccountId ?? null,
          folderId: input.folderId ?? null,
          webhookSecret,
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

      const existing = await db.scenario.findUnique({
        where: { id: input.id },
        select: {
          userId: true,
          webhookSecret: true,
          steps: {
            orderBy: { position: "asc" },
            select: { moduleType: true },
          },
        },
      });
      if (existing?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
      }

      const nextWebhookSecret =
        isWebhookTrigger(input.data.steps ?? existing.steps) &&
        !existing.webhookSecret
          ? randomBytes(32).toString("hex")
          : undefined;

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
          ...(input.data.enabled !== undefined && {
            enabled: input.data.enabled,
          }),
          ...(nextWebhookSecret !== undefined && {
            webhookSecret: nextWebhookSecret,
          }),
        },
        include: { steps: { orderBy: { position: "asc" } } },
      });

      return scenarioToFrontend(scenario);
    }),

  toggleEnabled: authedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.scenario.findUnique({
        where: { id: input.id },
      });
      if (existing?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
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
      const existing = await db.scenario.findUnique({
        where: { id: input.id },
      });
      if (existing?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
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
      const existing = await db.scenario.findUnique({
        where: { id: input.id },
      });
      if (existing?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
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

  testRunStep: authedProcedure
    .input(z.object({ scenarioId: z.string(), stepId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const scenario = await db.scenario.findUnique({
        where: { id: input.scenarioId },
        include: { steps: { orderBy: { position: "asc" } } },
      });
      if (scenario?.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.scenarioId} not found`,
        });
      }

      const target = scenario.steps.find((step) => step.id === input.stepId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Step not found" });
      }

      const runContext = new RunContext();
      let lastStartMeta: ReturnType<typeof buildStepStartLogMeta> | null = null;

      for (const step of scenario.steps.filter(
        (s) => s.position <= target.position,
      )) {
        const stepStart = Date.now();
        const upstreamRows = runContext.getUpstreamRows(step.position);
        const upstreamRow0 =
          typeof upstreamRows[0] === "object" && upstreamRows[0] !== null
            ? (upstreamRows[0] as Record<string, unknown>)
            : {};
        const resolvedStep = toScenarioStepWithConfig(
          step,
          resolveStepConfig(step.config, upstreamRow0),
        );
        const startMeta = buildStepStartLogMeta(resolvedStep, upstreamRows);

        try {
          const result = await getHandler(step.moduleType)(
            resolvedStep,
            runContext,
            ctx.userId,
          );
          const durationMs = Date.now() - stepStart;
          const completeMeta = buildStepCompleteLogMeta(
            step,
            result,
            durationMs,
          );
          runContext.setMeta(step.position, {
            durationMs,
            rowCount: result.rowCount,
            sheetsUrl: result.sheetsUrl,
          });

          if (step.id === target.id) {
            const outputSampleRows = completeMeta.sampleRows;
            return {
              inputConfig: startMeta.inputConfig,
              inputSampleRows: startMeta.inputSampleRows,
              outputSampleRows,
              rowCount: completeMeta.rowCount,
              durationMs,
              leadUrl: firstUrl(outputSampleRows),
            };
          }
        } catch (error) {
          if (step.id !== target.id) throw error;
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            inputConfig: startMeta.inputConfig,
            inputSampleRows: startMeta.inputSampleRows,
            outputSampleRows: [],
            rowCount: 0,
            durationMs: Date.now() - stepStart,
            error: message,
            leadUrl: null,
          };
        }

        lastStartMeta = startMeta;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: lastStartMeta
          ? "Step did not return a result"
          : "No steps executed",
      });
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.scenario.findUnique({
        where: { id: input.id },
      });
      if (existing?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scenario ${input.id} not found`,
        });
      }

      const duplicate = await db.scenario.create({
        data: {
          userId,
          name: `${source.name} (copy)`,
          kind: "CUSTOM",
          enabled: false,
          adAccountId: source.adAccountId,
          folderId: source.folderId,
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

  /**
   * Move one or more scenarios to a folder (or to root with folderId=null).
   */
  move: authedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        folderId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      // Verify all scenarios belong to this user
      const count = await db.scenario.count({
        where: { id: { in: input.ids }, userId },
      });
      if (count !== input.ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more scenarios not found",
        });
      }

      // Verify folder belongs to this user if specified
      if (input.folderId !== null) {
        const folder = await db.folder.findUnique({
          where: { id: input.folderId },
          select: { userId: true },
        });
        if (folder?.userId !== userId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
        }
      }

      await db.scenario.updateMany({
        where: { id: { in: input.ids }, userId },
        data: { folderId: input.folderId },
      });

      return { success: true as const, count: input.ids.length };
    }),

  /**
   * Bulk enable or disable scenarios.
   */
  bulkSetEnabled: authedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      const count = await db.scenario.count({
        where: { id: { in: input.ids }, userId },
      });
      if (count !== input.ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more scenarios not found",
        });
      }

      await db.scenario.updateMany({
        where: { id: { in: input.ids }, userId },
        data: { enabled: input.enabled },
      });

      return { success: true as const, count: input.ids.length };
    }),

  /**
   * Bulk delete scenarios.
   */
  bulkDelete: authedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      const count = await db.scenario.count({
        where: { id: { in: input.ids }, userId },
      });
      if (count !== input.ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more scenarios not found",
        });
      }

      await db.scenario.deleteMany({
        where: { id: { in: input.ids }, userId },
      });

      return { success: true as const, count: input.ids.length };
    }),

  /**
   * Search scenarios — scoped or global.
   * When recursive=true and folderId is set, searches the full subtree.
   */
  search: authedProcedure
    .input(
      z.object({
        q: z.string().min(1),
        folderId: z.string().nullable().optional(),
        recursive: z.boolean().default(false),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const terms = input.q.trim().split(/\s+/).filter(Boolean);

      type SearchWhere = {
        userId: string;
        folderId?: string | null | { in: string[] };
        AND?: Array<{ name: { contains: string; mode: "insensitive" } }>;
      };

      const where: SearchWhere = { userId };

      if (terms.length > 0) {
        where.AND = terms.map((term) => ({
          name: { contains: term, mode: "insensitive" as const },
        }));
      }

      if (input.folderId !== undefined) {
        if (input.recursive && input.folderId !== null) {
          // Collect all folder IDs in the subtree
          const subtree = new Set<string>([input.folderId]);
          const queue = [input.folderId];
          while (queue.length > 0) {
            const cur = queue.shift()!;
            const children = await db.folder.findMany({
              where: { parentId: cur, userId },
              select: { id: true },
            });
            for (const c of children) {
              subtree.add(c.id);
              queue.push(c.id);
            }
          }
          where.folderId = { in: Array.from(subtree) };
        } else {
          where.folderId = input.folderId;
        }
      }

      const scenarios = await db.scenario.findMany({
        where,
        include: { steps: { orderBy: { position: "asc" } } },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });

      return scenarios.map(scenarioToFrontend);
    }),
});
