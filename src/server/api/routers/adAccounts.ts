import { z } from "zod";

import { MOCK_AD_ACCOUNTS } from "~/server/mocks/data";
import type { AdAccount } from "~/server/mocks/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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

export const adAccountsRouter = createTRPCRouter({
  list: publicProcedure.query((): AdAccount[] => MOCK_AD_ACCOUNTS),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }): AdAccount => {
      const acc = MOCK_AD_ACCOUNTS.find((a) => a.id === input.id);
      if (!acc) throw new Error(`Ad account ${input.id} not found`);
      return acc;
    }),

  create: publicProcedure
    .input(AdAccountInputSchema)
    .mutation(({ input }): AdAccount => ({
      id: `acc_new_${Date.now()}`,
      userId: "user_01",
      ...input,
      lastRunAt: null,
      lastRunStatus: null,
      createdAt: new Date(),
    })),

  update: publicProcedure
    .input(z.object({ id: z.string(), data: AdAccountInputSchema }))
    .mutation(({ input }): AdAccount => {
      const existing = MOCK_AD_ACCOUNTS.find((a) => a.id === input.id);
      if (!existing) throw new Error(`Ad account ${input.id} not found`);
      return { ...existing, ...input.data };
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
    .mutation(({ input }): { runId: string; adAccountId: string } => ({
      runId: `run_manual_${Date.now()}`,
      adAccountId: input.id,
    })),
});
