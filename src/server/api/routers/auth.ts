import { auth } from "~/server/auth";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async () => {
    const session = await auth();
    return session ?? null;
  }),
});
