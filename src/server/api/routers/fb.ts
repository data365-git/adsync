import { MOCK_FB_ACCOUNTS } from "~/lib/mock-fb-accounts";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const fbRouter = createTRPCRouter({
  listAvailableAccounts: publicProcedure.query(
    (): { id: string; name: string }[] => MOCK_FB_ACCOUNTS,
  ),
});
