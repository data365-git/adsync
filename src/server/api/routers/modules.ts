import { TRPCError } from "@trpc/server";
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
  "trigger.webhook",
  "trigger.watch.sheets_new_rows",
  "trigger.watch.bitrix_new_lead",
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

/**
 * Templates are exposed without their `factory` (a function won't serialize
 * cleanly across tRPC + SuperJSON). Callers use getTemplate to fetch the
 * server-generated draft step shape for a selected template.
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

  getTemplate: publicProcedure
    .input(z.object({ templateId: z.string() }))
    .query(({ input }) => {
      const tpl = SCENARIO_TEMPLATES.find((t) => t.id === input.templateId);
      if (!tpl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found.",
        });
      }

      const scenario = tpl.factory();
      return {
        id: tpl.id,
        name: tpl.name,
        steps: scenario.steps.map((s) => ({
          position: s.position,
          moduleType: s.moduleType,
          config: s.config,
        })),
      };
    }),

  getStepOutputSample: publicProcedure
    .input(
      z.object({
        moduleType: ModuleTypeSchema,
        // Phase 1.5: config is accepted but ignored; the sample is static.
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .query(({ input }): Record<string, unknown>[] => {
      const mod = getModule(input.moduleType);
      if (!mod) throw new Error(`Unknown module type: ${input.moduleType}`);
      return mod.sampleOutput;
    }),
});
