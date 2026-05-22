import { z } from "zod";

import { createTRPCRouter, authedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const userSettingsSelect = {
  userId: true,
  emailOnFailure: true,
  genericWebhookUrl: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  schedulesPaused: true,
  defaultSheetTemplate: true,
  weekStartsOn: true,
  displayName: true,
  defaultAdAccountBehavior: true,
} as const;

const userSettingsUpdateSchema = z
  .object({
    emailOnFailure: z.boolean(),
    genericWebhookUrl: z.string().nullable(),
    quietHoursStart: z.string().nullable(),
    quietHoursEnd: z.string().nullable(),
    schedulesPaused: z.boolean(),
    defaultSheetTemplate: z.string().nullable(),
    weekStartsOn: z.number().int().min(0).max(6),
    displayName: z.string().nullable(),
    defaultAdAccountBehavior: z.string().nullable(),
  })
  .partial();

export const userSettingsRouter = createTRPCRouter({
  get: authedProcedure.query(async ({ ctx }) => {
    return db.userSettings.upsert({
      where: { userId: ctx.userId },
      create: { userId: ctx.userId },
      update: {},
      select: userSettingsSelect,
    });
  }),

  update: authedProcedure
    .input(userSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.schedulesPaused === undefined) {
        return db.userSettings.upsert({
          where: { userId: ctx.userId },
          create: { userId: ctx.userId, ...input },
          update: input,
          select: userSettingsSelect,
        });
      }

      const [settings] = await db.$transaction([
        db.userSettings.upsert({
          where: { userId: ctx.userId },
          create: { userId: ctx.userId, ...input },
          update: input,
          select: userSettingsSelect,
        }),
        db.user.update({
          where: { id: ctx.userId },
          data: { schedulesPaused: input.schedulesPaused },
          select: { id: true },
        }),
      ]);

      return settings;
    }),
});
