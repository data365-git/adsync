import { z } from "zod";

import { MOCK_RUNS, MOCK_SCENARIOS } from "~/server/mocks/data";
import type { Run, Scenario, ScenarioStep } from "~/server/mocks/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const ModuleTypeSchema = z.enum([
  "trigger.schedule",
  "trigger.manual",
  "fb.account_insights",
  "fb.campaign_insights",
  "fb.ad_insights",
  "sheets.append",
  "sheets.upsert",
]);

const ScenarioStepInput = z.object({
  id: z.string().optional(),
  position: z.number().int().min(1),
  moduleType: ModuleTypeSchema,
  config: z.record(z.string(), z.unknown()),
});

const ScenarioCreateInput = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(false),
  steps: z.array(ScenarioStepInput).min(1),
});

const ScenarioUpdateInput = z.object({
  id: z.string(),
  data: z.object({
    name: z.string().min(1).max(120).optional(),
    enabled: z.boolean().optional(),
    steps: z.array(ScenarioStepInput).optional(),
  }),
});

type TestStepResult = {
  stepId: string;
  status: "success" | "failed";
  output: Record<string, unknown>;
  durationMs: number;
};

function nowISO(): string {
  return new Date().toISOString();
}

function withIds(
  scenarioId: string,
  steps: z.infer<typeof ScenarioStepInput>[],
): ScenarioStep[] {
  return steps.map((s, idx) => ({
    id: s.id ?? `${scenarioId}_step_${idx + 1}`,
    scenarioId,
    position: s.position,
    moduleType: s.moduleType,
    config: s.config,
  }));
}

export const scenariosRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          includeQuickSetup: z.boolean().optional(),
        })
        .optional(),
    )
    .query(({ input }): Scenario[] => {
      const includeQuick = input?.includeQuickSetup ?? false;
      return includeQuick
        ? MOCK_SCENARIOS
        : MOCK_SCENARIOS.filter((s) => s.kind !== "QUICK_SETUP");
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }): Scenario => {
      const scn = MOCK_SCENARIOS.find((s) => s.id === input.id);
      if (!scn) throw new Error(`Scenario ${input.id} not found`);
      return scn;
    }),

  create: publicProcedure
    .input(ScenarioCreateInput)
    .mutation(({ input }): Scenario => {
      const id = `scn_custom_new_${Date.now()}`;
      const now = new Date();
      return {
        id,
        userId: "user_01",
        name: input.name,
        kind: "CUSTOM",
        enabled: input.enabled,
        steps: withIds(id, input.steps),
        lastRunAt: null,
        lastRunStatus: null,
        createdAt: now,
        updatedAt: now,
      };
    }),

  update: publicProcedure
    .input(ScenarioUpdateInput)
    .mutation(({ input }): Scenario => {
      const existing = MOCK_SCENARIOS.find((s) => s.id === input.id);
      if (!existing) throw new Error(`Scenario ${input.id} not found`);
      const next: Scenario = {
        ...existing,
        name: input.data.name ?? existing.name,
        enabled: input.data.enabled ?? existing.enabled,
        steps: input.data.steps
          ? withIds(existing.id, input.data.steps)
          : existing.steps,
        updatedAt: new Date(),
      };
      return next;
    }),

  toggleEnabled: publicProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(
      ({ input }): { id: string; enabled: boolean } => ({
        id: input.id,
        enabled: input.enabled,
      }),
    ),

  runNow: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }): Run => {
      const scenario = MOCK_SCENARIOS.find((s) => s.id === input.id);
      if (!scenario) throw new Error(`Scenario ${input.id} not found`);
      const now = new Date();
      // Best-effort guess at the ad account from the scenario's first FB step.
      const fbStep = scenario.steps.find((s) =>
        s.moduleType.startsWith("fb."),
      );
      const fbAccountId =
        typeof fbStep?.config.fbAccountId === "string"
          ? fbStep.config.fbAccountId
          : "";
      return {
        id: `run_manual_${Date.now()}`,
        userId: scenario.userId,
        adAccountId: fbAccountId,
        scenarioId: scenario.id,
        trigger: "manual",
        status: "running",
        startedAt: now,
        finishedAt: null,
        campaignRowsWritten: null,
        adRowsWritten: null,
        durationMs: null,
        errorMessage: null,
        sheetsUrl: null,
      };
    }),

  testRun: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }): TestStepResult[] => {
      const scenario = MOCK_SCENARIOS.find((s) => s.id === input.id);
      if (!scenario) throw new Error(`Scenario ${input.id} not found`);
      return scenario.steps.map((s, idx) => ({
        stepId: s.id,
        status: "success",
        durationMs: 320 + idx * 180,
        output: {
          step: s.position,
          module: s.moduleType,
          ranAt: nowISO(),
          // Realistic-but-abbreviated sample; real shape per module is in lib/modules.ts
          sample:
            s.moduleType === "trigger.schedule" ||
            s.moduleType === "trigger.manual"
              ? { triggeredAt: nowISO() }
              : s.moduleType.startsWith("fb.")
                ? { rowsFetched: 14, firstId: "23845678234" }
                : { rowsAppended: 14, rowsUpdated: 0 },
        },
      }));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }): { success: true; id: string } => ({
      success: true,
      id: input.id,
    })),

  duplicate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }): Scenario => {
      const source = MOCK_SCENARIOS.find((s) => s.id === input.id);
      if (!source) throw new Error(`Scenario ${input.id} not found`);
      const newId = `scn_custom_dup_${Date.now()}`;
      const now = new Date();
      return {
        ...source,
        id: newId,
        name: `${source.name} (copy)`,
        kind: "CUSTOM",
        enabled: false,
        steps: source.steps.map((s, idx) => ({
          ...s,
          id: `${newId}_step_${idx + 1}`,
          scenarioId: newId,
        })),
        lastRunAt: null,
        lastRunStatus: null,
        createdAt: now,
        updatedAt: now,
      };
    }),

  /**
   * Convenience: count of runs per scenario, used by the list page.
   * Mocked from MOCK_RUNS at request time.
   */
  runCounts: publicProcedure.query((): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const r of MOCK_RUNS) {
      counts[r.scenarioId] = (counts[r.scenarioId] ?? 0) + 1;
    }
    return counts;
  }),
});
