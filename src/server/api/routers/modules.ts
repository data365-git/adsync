import { z } from "zod";

import {
  MODULES,
  getModule,
  type ModuleDefinition,
} from "~/lib/modules";
import {
  SCENARIO_TEMPLATES,
  type ScenarioTemplate,
} from "~/lib/scenario-templates";
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

/**
 * Templates are exposed without their `factory` (a function won't serialize
 * cleanly across tRPC + SuperJSON). Callers re-look-up the factory by id from
 * `~/lib/scenario-templates` on the client side.
 */
type SerializableTemplate = Omit<ScenarioTemplate, "factory">;

export const modulesRouter = createTRPCRouter({
  listModules: publicProcedure.query((): ModuleDefinition[] => MODULES),

  listTemplates: publicProcedure.query((): SerializableTemplate[] =>
    SCENARIO_TEMPLATES.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  ),

  getStepOutputSample: publicProcedure
    .input(
      z.object({
        moduleType: ModuleTypeSchema,
        // Phase 1.5: config is accepted but ignored; the sample is static.
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .query(({ input }): Record<string, unknown> => {
      const mod = getModule(input.moduleType);
      if (!mod) throw new Error(`Unknown module type: ${input.moduleType}`);
      return mod.sampleOutput;
    }),
});
