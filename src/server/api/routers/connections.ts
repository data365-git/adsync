import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, authedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { Provider, ConnectionStatus } from "@prisma/client";

import { getAuthedClient } from "~/integrations/google/oauth";

type OAuthConnectionRow = {
  id: string;
  userId: string;
  provider: Provider;
  status: ConnectionStatus;
  email: string | null;
  expiresAt: Date | null;
  connectedAt: Date | null;
};

function toFrontendConnection(row: OAuthConnectionRow) {
  const provider = {
    [Provider.GOOGLE_SHEETS]: "google",
    [Provider.FACEBOOK]: "facebook",
    [Provider.BITRIX24]: "bitrix",
  } as const;

  const status = {
    [ConnectionStatus.CONNECTED]: "connected",
    [ConnectionStatus.EXPIRED]: "expired",
    [ConnectionStatus.DISCONNECTED]: "disconnected",
  } as const;

  return {
    id: row.id,
    userId: row.userId,
    provider: provider[row.provider],
    status: status[row.status],
    email: row.email,
    expiresAt: row.expiresAt,
    connectedAt: row.connectedAt,
  };
}

export const connectionsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const rows = await db.oAuthConnection.findMany({
      where: { userId: ctx.userId },
    });

    return rows.map(toFrontendConnection);
  }),

  connect: authedProcedure
    .input(z.object({ provider: z.enum(["google", "facebook", "bitrix"]) }))
    .mutation(({ input }) => {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      return { redirectUrl: `${baseUrl}/api/oauth/${input.provider}` };
    }),

  disconnect: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.oAuthConnection.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { status: ConnectionStatus.DISCONNECTED },
      });

      return { id: input.id, status: "disconnected" as const };
    }),

  refresh: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await db.oAuthConnection.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (row.provider === Provider.GOOGLE_SHEETS) {
        await getAuthedClient(ctx.userId);

        const updatedRow = await db.oAuthConnection.findUnique({
          where: { id: input.id },
        });

        return toFrontendConnection(updatedRow!);
      }

      if (row.provider === Provider.FACEBOOK) {
        if (row.expiresAt && row.expiresAt < new Date()) {
          await db.oAuthConnection.update({
            where: { id: input.id },
            data: { status: ConnectionStatus.EXPIRED },
          });
        }

        const updatedRow = await db.oAuthConnection.findUnique({
          where: { id: input.id },
        });

        return toFrontendConnection(updatedRow!);
      }

      return toFrontendConnection(row);
    }),
});
