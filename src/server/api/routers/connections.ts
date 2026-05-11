import { z } from "zod";
import { db } from "~/server/db";
import { Provider, ConnectionStatus } from "@prisma/client";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { getAuthedClient } from "~/integrations/google/oauth";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function toFrontendConnection(conn: {
  id: string;
  provider: Provider;
  status: ConnectionStatus;
  email: string | null;
  expiresAt: Date | null;
  connectedAt: Date;
}) {
  return {
    id: conn.id,
    provider:
      conn.provider === Provider.GOOGLE_SHEETS
        ? ("google" as const)
        : ("facebook" as const),
    status:
      conn.status === ConnectionStatus.CONNECTED
        ? ("connected" as const)
        : conn.status === ConnectionStatus.EXPIRED
          ? ("expired" as const)
          : ("disconnected" as const),
    email: conn.email,
    expiresAt: conn.expiresAt,
    connectedAt: conn.connectedAt,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const connectionsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const conns = await db.oAuthConnection.findMany({
      where: { userId: ctx.userId },
    });
    return conns.map(toFrontendConnection);
  }),

  connect: authedProcedure
    .input(z.object({ provider: z.enum(["google", "facebook"]) }))
    .mutation(async ({ input }) => {
      // Returns the OAuth initiation URL; actual token storage happens in the callback routes.
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const url =
        input.provider === "google"
          ? `${baseUrl}/api/oauth/google`
          : `${baseUrl}/api/oauth/facebook`;
      return { redirectUrl: url };
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
      const conn = await db.oAuthConnection.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!conn) throw new Error(`Connection ${input.id} not found`);

      if (conn.provider === Provider.GOOGLE_SHEETS) {
        // Force a token refresh by calling getAuthedClient (auto-refreshes if expiring within 5 min)
        await getAuthedClient(ctx.userId);
        const updated = await db.oAuthConnection.findUniqueOrThrow({
          where: { id: conn.id },
        });
        return toFrontendConnection({
          ...updated,
          connectedAt: updated.connectedAt,
        });
      }

      // Facebook: tokens are long-lived and don't refresh via API.
      // If the token is expired, surface EXPIRED status so UI prompts reconnect.
      if (conn.expiresAt && conn.expiresAt < new Date()) {
        await db.oAuthConnection.update({
          where: { id: conn.id },
          data: { status: ConnectionStatus.EXPIRED },
        });
        return toFrontendConnection({
          ...conn,
          status: ConnectionStatus.EXPIRED,
          connectedAt: conn.connectedAt,
        });
      }
      return toFrontendConnection({ ...conn, connectedAt: conn.connectedAt });
    }),
});
