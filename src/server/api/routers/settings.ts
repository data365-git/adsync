import { z } from "zod";

import { MOCK_USER } from "~/server/mocks/data";
import type { User } from "~/server/mocks/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const ThemeSchema = z.enum(["light", "dark", "system"]);

export const settingsRouter = createTRPCRouter({
  get: publicProcedure.query((): User => MOCK_USER),

  updateTheme: publicProcedure
    .input(z.object({ theme: ThemeSchema }))
    .mutation(({ input }): { theme: User["theme"] } => ({
      theme: input.theme,
    })),

  updateTimezone: publicProcedure
    .input(z.object({ timezone: z.string().min(1) }))
    .mutation(({ input }): { timezone: string } => ({
      timezone: input.timezone,
    })),

  deleteAllData: publicProcedure.mutation((): { ok: true } => ({ ok: true })),
});
