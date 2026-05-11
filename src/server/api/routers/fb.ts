import { createTRPCRouter, authedProcedure } from "~/server/api/trpc";
import { listAdAccounts } from "~/integrations/facebook/graph-client";

export const fbRouter = createTRPCRouter({
  listAvailableAccounts: authedProcedure.query(async ({ ctx }) => {
    return listAdAccounts(ctx.userId);
  }),
});
