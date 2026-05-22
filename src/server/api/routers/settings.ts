import { z } from "zod";

import { createTRPCRouter, authedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const ThemeSchema = z.enum(["light", "dark", "system"]);

export const settingsRouter = createTRPCRouter({
  get: authedProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        allowlisted: true,
        timezone: true,
        theme: true,
        createdAt: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      image: user.image,
      allowlisted: user.allowlisted,
      timezone: user.timezone,
      theme: ThemeSchema.catch("system").parse(user.theme),
      createdAt: user.createdAt,
    };
  }),

  updateTheme: authedProcedure
    .input(z.object({ theme: ThemeSchema }))
    .mutation(async ({ ctx, input }) => {
      await db.user.update({
        where: { id: ctx.userId },
        data: { theme: input.theme },
      });
      return { theme: input.theme };
    }),

  updateTimezone: authedProcedure
    .input(z.object({ timezone: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.user.update({
        where: { id: ctx.userId },
        data: { timezone: input.timezone },
      });
      return { timezone: input.timezone };
    }),

  deleteAllData: authedProcedure.mutation(async ({ ctx }) => {
    await db.user.delete({ where: { id: ctx.userId } });
    return { ok: true } as const;
  }),

  exportData: authedProcedure.query(async ({ ctx }) => {
    const [scenarios, runs] = await Promise.all([
      db.scenario.findMany({
        where: { userId: ctx.userId },
        include: {
          steps: { orderBy: { position: "asc" } },
          runs: { orderBy: { startedAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.run.findMany({
        where: { userId: ctx.userId },
        include: { logs: { orderBy: { ts: "asc" } } },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      scenarios,
      runs,
    };
  }),

  resetRuns: authedProcedure.mutation(async ({ ctx }) => {
    const result = await db.run.deleteMany({ where: { userId: ctx.userId } });
    return { ok: true, count: result.count } as const;
  }),

  deleteAccount: authedProcedure.mutation(async ({ ctx }) => {
    await db.user.delete({ where: { id: ctx.userId } });
    return { ok: true } as const;
  }),
});
