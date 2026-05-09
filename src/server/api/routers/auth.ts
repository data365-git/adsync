import { getMockSession } from "~/server/mocks/session";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(() => getMockSession()),
});
