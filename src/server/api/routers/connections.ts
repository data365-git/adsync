import { z } from "zod";

import { MOCK_CONNECTIONS } from "~/server/mocks/data";
import type { OAuthConnection } from "~/server/mocks/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const ProviderSchema = z.enum(["google", "facebook"]);

export const connectionsRouter = createTRPCRouter({
  list: publicProcedure.query((): OAuthConnection[] => MOCK_CONNECTIONS),

  connect: publicProcedure
    .input(z.object({ provider: ProviderSchema }))
    .mutation(({ input }): OAuthConnection => {
      const existing = MOCK_CONNECTIONS.find(
        (c) => c.provider === input.provider,
      );
      const now = new Date();
      return {
        id: existing?.id ?? `oauth_${input.provider}_new`,
        userId: "user_01",
        provider: input.provider,
        status: "connected",
        email: existing?.email ?? "jumanovsamandar005@gmail.com",
        expiresAt:
          input.provider === "google"
            ? new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
            : null,
        connectedAt: now,
      };
    }),

  disconnect: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }): { id: string; status: "disconnected" } => ({
      id: input.id,
      status: "disconnected",
    })),

  refresh: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }): OAuthConnection => {
      const existing = MOCK_CONNECTIONS.find((c) => c.id === input.id);
      if (!existing) {
        throw new Error(`Connection ${input.id} not found`);
      }
      const now = new Date();
      return {
        ...existing,
        status: "connected",
        connectedAt: now,
        expiresAt:
          existing.provider === "google"
            ? new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
            : null,
      };
    }),
});
