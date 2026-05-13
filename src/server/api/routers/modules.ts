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
    .query(({ input }): Record<string, unknown>[] => {
      const mod = getModule(input.moduleType);
      if (!mod) throw new Error(`Unknown module type: ${input.moduleType}`);
      return mod.sampleOutput;
    }),
});
