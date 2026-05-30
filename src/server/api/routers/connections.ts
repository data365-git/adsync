import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, authedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { Provider, ConnectionStatus } from "@prisma/client";
import { google } from "googleapis";

import { getAuthedClient } from "~/integrations/google/oauth";
import { connectWebhook } from "~/integrations/bitrix/oauth";
import { call as bitrixCall } from "~/server/bitrix24/client";

type OAuthConnectionRow = {
  id: string;
  userId: string;
  provider: Provider;
  status: ConnectionStatus;
  email: string | null;
  scope: string | null;
  expiresAt: Date | null;
  connectedAt: Date | null;
  lastVerifiedAt: Date | null;
  updatedAt: Date;
};

function toFrontendConnection(row: OAuthConnectionRow) {
  const provider = {
    [Provider.GOOGLE_SHEETS]: "google",
    [Provider.FACEBOOK]: "facebook" as const, // kept for DB compat — no UI card
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
    scope: row.scope,
    expiresAt: row.expiresAt,
    connectedAt: row.connectedAt,
    issuedAt: row.connectedAt,
    lastVerifiedAt: row.lastVerifiedAt,
    updatedAt: row.updatedAt,
  };
}

function providerFromInput(
  provider: "google" | "bitrix",
): Provider {
  if (provider === "google") return Provider.GOOGLE_SHEETS;
  return Provider.BITRIX24;
}

type ConnectionTestResult = {
  ok: boolean;
  asUser?: string;
  message: string;
  latencyMs: number;
};

const TEST_CACHE_TTL_MS = 60_000;
const testCache = new Map<
  string,
  { result: ConnectionTestResult; expiresAt: number }
>();

async function runConnectionTest(
  userId: string,
  provider: "google" | "bitrix",
): Promise<ConnectionTestResult> {
  const startedAt = Date.now();

  try {
    if (provider === "google") {
      const auth = await getAuthedClient(userId);
      const drive = google.drive({ version: "v3", auth });
      const response = await drive.about.get({ fields: "user" });
      const user = response.data.user;
      const asUser =
        user?.emailAddress ?? user?.displayName ?? user?.permissionId ?? undefined;

      return {
        ok: true,
        asUser,
        message: asUser
          ? `Google Drive responded for ${asUser}.`
          : "Google Drive responded.",
        latencyMs: Date.now() - startedAt,
      };
    }

    // Use the user's first connected portal — never the global webhook.
    const portal = await db.bitrixPortal.findFirst({
      where: { userId, status: { not: ConnectionStatus.DISCONNECTED } },
      orderBy: { connectedAt: "desc" },
      select: { id: true, domain: true },
    });
    if (!portal) {
      return {
        ok: false,
        message: "No Bitrix24 portal connected. Connect a portal first.",
        latencyMs: Date.now() - startedAt,
      };
    }
    await bitrixCall<unknown[]>(
      "crm.dealcategory.list",
      { start: 0 },
      { portalId: portal.id },
    );

    return {
      ok: true,
      message: `Bitrix24 portal ${portal.domain} responded.`,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    void error;
    return {
      ok: false,
      message: "Connection test failed. Reconnect this provider and try again.",
      latencyMs: Date.now() - startedAt,
    };
  }
}

export const connectionsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const rows = await db.oAuthConnection.findMany({
      where: { userId: ctx.userId },
    });

    return rows.map(toFrontendConnection);
  }),

  connect: authedProcedure
    .input(z.object({ provider: z.enum(["google", "bitrix"]) }))
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

  disconnectAll: authedProcedure.mutation(async ({ ctx }) => {
    const result = await db.oAuthConnection.deleteMany({
      where: { userId: ctx.userId },
    });

    return { ok: true, count: result.count } as const;
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

      return toFrontendConnection(row);
    }),

  verify: authedProcedure
    .input(z.object({ provider: z.enum(["google", "bitrix"]) }))
    .mutation(async ({ ctx, input }) => {
      const providerEnum = providerFromInput(input.provider);
      const conn = await db.oAuthConnection.findUnique({
        where: {
          userId_provider: { userId: ctx.userId, provider: providerEnum },
        },
      });

      if (!conn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Not connected.",
        });
      }

      let ok = false;
      try {
        if (input.provider === "google") {
          const auth = await getAuthedClient(ctx.userId);
          const drive = google.drive({ version: "v3", auth });
          await drive.about.get({ fields: "user" });
          ok = true;
        } else {
          // Use the user's first connected portal — never the global webhook.
          const portal = await db.bitrixPortal.findFirst({
            where: {
              userId: ctx.userId,
              status: { not: ConnectionStatus.DISCONNECTED },
            },
            orderBy: { connectedAt: "desc" },
            select: { id: true },
          });
          if (portal) {
            await bitrixCall<unknown[]>(
              "crm.dealcategory.list",
              { start: 0 },
              { portalId: portal.id },
            );
            ok = true;
          }
        }
      } catch {
        ok = false;
      }

      const lastVerifiedAt = new Date();
      await db.oAuthConnection.update({
        where: {
          userId_provider: { userId: ctx.userId, provider: providerEnum },
        },
        data: {
          lastVerifiedAt,
          status: ok ? ConnectionStatus.CONNECTED : ConnectionStatus.EXPIRED,
        },
      });

      return { ok, lastVerifiedAt };
    }),

  test: authedProcedure
    .input(z.object({ provider: z.enum(["google", "bitrix"]) }))
    .mutation(async ({ ctx, input }) => {
      const providerEnum = providerFromInput(input.provider);
      const conn = await db.oAuthConnection.findUnique({
        where: {
          userId_provider: { userId: ctx.userId, provider: providerEnum },
        },
      });

      if (!conn || conn.status === ConnectionStatus.DISCONNECTED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Provider is not connected.",
        });
      }

      const cacheKey = `${ctx.userId}:${input.provider}`;
      const cached = testCache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        return cached.result;
      }

      const result = await runConnectionTest(ctx.userId, input.provider);
      testCache.set(cacheKey, {
        result,
        expiresAt: now + TEST_CACHE_TTL_MS,
      });

      return result;
    }),

  bitrixHealth: authedProcedure.query(async ({ ctx }) => {
    const { checkBitrixHealth } = await import("~/server/bitrix24/health");
    return checkBitrixHealth(ctx.session.user?.id ?? ctx.userId);
  }),

  /**
   * List Google Drive spreadsheets accessible via the connected Google account.
   * Uses the drive.metadata.readonly scope — no spreadsheet content is read.
   * Returns up to 25 files; callers show "and N more" when truncated is true.
   */
  googleSheetsResources: authedProcedure.query(async ({ ctx }) => {
    const conn = await db.oAuthConnection.findUnique({
      where: {
        userId_provider: {
          userId: ctx.userId,
          provider: Provider.GOOGLE_SHEETS,
        },
      },
    });
    if (conn?.status !== ConnectionStatus.CONNECTED) {
      return { identifier: null, items: [], truncated: false };
    }

    const auth = await getAuthedClient(ctx.userId);
    const drive = google.drive({ version: "v3", auth });

    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id,name,webViewLink)",
      pageSize: 26,
      orderBy: "modifiedTime desc",
    });

    const files = res.data.files ?? [];
    const truncated = files.length > 25;
    const items = files.slice(0, 25).map((f) => ({
      id: f.id ?? "",
      name: f.name ?? "(untitled)",
      url: f.webViewLink ?? null,
    }));

    return {
      identifier: conn.email ? `Connected as ${conn.email}` : null,
      items,
      truncated,
      totalCount: files.length,
    };
  }),

  /**
   * List Google Drive spreadsheets for the scenario builder's spreadsheet picker.
   * Returns up to 200 files ordered by most-recently-modified.
   * Shape: { id, name }[] — no URL, no truncation flag (builder doesn't need it).
   */
  listSpreadsheets: authedProcedure.query(async ({ ctx }) => {
    const conn = await db.oAuthConnection.findUnique({
      where: {
        userId_provider: {
          userId: ctx.userId,
          provider: Provider.GOOGLE_SHEETS,
        },
      },
    });
    if (conn?.status !== ConnectionStatus.CONNECTED) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Google Sheets not connected",
      });
    }

    const auth = await getAuthedClient(ctx.userId);
    const drive = google.drive({ version: "v3", auth });

    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id,name)",
      pageSize: 200,
      orderBy: "modifiedTime desc",
    });

    return (res.data.files ?? []).map((f) => ({
      id: f.id ?? "",
      name: f.name ?? "(untitled)",
    }));
  }),

  /**
   * List the tabs (sheets) inside a given spreadsheet.
   * Returns { title, sheetId }[] sorted by sheet index.
   */
  listSheetTabs: authedProcedure
    .input(z.object({ spreadsheetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const conn = await db.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId: ctx.userId,
            provider: Provider.GOOGLE_SHEETS,
          },
        },
      });
      if (conn?.status !== ConnectionStatus.CONNECTED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Sheets not connected",
        });
      }

      const auth = await getAuthedClient(ctx.userId);
      const sheets = google.sheets({ version: "v4", auth });

      const res = await sheets.spreadsheets.get({
        spreadsheetId: input.spreadsheetId,
        fields: "sheets(properties(title,sheetId,index))",
      });

      return (res.data.sheets ?? [])
        .sort((a, b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0))
        .map((s) => ({
          title: s.properties?.title ?? "",
          sheetId: s.properties?.sheetId ?? 0,
        }));
    }),

  /**
   * Read the header row (A1:ZZ1) from a given tab and return column names.
   * Filters out empty/whitespace-only cells.
   */
  listSheetColumns: authedProcedure
    .input(
      z.object({
        spreadsheetId: z.string().min(1),
        tabName: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conn = await db.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId: ctx.userId,
            provider: Provider.GOOGLE_SHEETS,
          },
        },
      });
      if (conn?.status !== ConnectionStatus.CONNECTED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Sheets not connected",
        });
      }

      const auth = await getAuthedClient(ctx.userId);
      const sheets = google.sheets({ version: "v4", auth });

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: input.spreadsheetId,
        range: `${input.tabName}!A1:ZZ1`,
      });

      const firstRow = (res.data.values ?? [])[0] ?? [];
      return (firstRow as string[])
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }),

  /**
   * Read the header row plus the first data rows from a tab for Make-style
   * upstream value previews.
   */
  listSheetSample: authedProcedure
    .input(
      z.object({
        spreadsheetId: z.string().min(1),
        tabName: z.string().min(1),
        rowCount: z.number().int().min(1).max(10).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conn = await db.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId: ctx.userId,
            provider: Provider.GOOGLE_SHEETS,
          },
        },
      });
      if (conn?.status !== ConnectionStatus.CONNECTED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Sheets not connected",
        });
      }

      const rowCount = input.rowCount ?? 1;
      const auth = await getAuthedClient(ctx.userId);
      const sheets = google.sheets({ version: "v4", auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: input.spreadsheetId,
        range: `${input.tabName}!A1:ZZ${rowCount + 1}`,
      });

      const values = (res.data.values ?? []) as string[][];
      const columns = (values[0] ?? [])
        .map((value) => value.trim())
        .filter(Boolean);
      const rows = values
        .slice(1, rowCount + 1)
        .map((row) =>
          Object.fromEntries(
            columns.map((column, index) => [column, row[index] ?? ""]),
          ),
        );

      return { columns, rows };
    }),

  /**
   * List Bitrix24 deal categories (pipelines) for the given connected portal.
   * The lead pipeline is always singular in Bitrix24 — we return it as a fixed entry
   * and append the deal categories from crm.dealcategory.list.
   */
  bitrixPipelines: authedProcedure
    .input(z.object({ portalId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const portal = await db.bitrixPortal.findUnique({
        where: { id: input.portalId },
        select: { userId: true, domain: true },
      });
      if (portal?.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      }

      const identifier = `Portal: ${portal.domain}`;

      type DealCategory = { ID: string; NAME: string };
      const categories = await bitrixCall<DealCategory[]>(
        "crm.dealcategory.list",
        {},
        { portalId: input.portalId },
      );

      const items: { id: string; name: string }[] = [
        { id: "lead", name: "Leads (default pipeline)" },
        ...(categories ?? []).map((c) => ({ id: c.ID, name: c.NAME })),
      ];

      const truncated = items.length > 25;
      return {
        identifier,
        items: items.slice(0, 25),
        truncated,
        totalCount: items.length,
      };
    }),

  /**
   * Lightweight Bitrix24 destination info for the given connected portal —
   * the portal a lead/deal will actually be created in. No API call, no
   * token exposed; safe to render in step config so the user can see where
   * their records land. `crmLeadsUrl` deep-links to the portal's lead list.
   */
  bitrixDestination: authedProcedure
    .input(z.object({ portalId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const portal = await db.bitrixPortal.findUnique({
        where: { id: input.portalId },
        select: { userId: true, domain: true, clientEndpoint: true },
      });
      if (portal?.userId !== ctx.userId) {
        return { portal: null, origin: null, crmLeadsUrl: null };
      }
      try {
        const origin = new URL(portal.clientEndpoint).origin;
        return {
          portal: portal.domain,
          origin,
          crmLeadsUrl: `${origin}/crm/lead/list/`,
        };
      } catch {
        return { portal: portal.domain, origin: null, crmLeadsUrl: null };
      }
    }),

  /**
   * List the Bitrix24 portals this user has connected via OAuth. Used by the
   * Connections page and the portal picker in the Create-Lead step.
   */
  listBitrixPortals: authedProcedure.query(async ({ ctx }) => {
    return db.bitrixPortal.findMany({
      where: {
        userId: ctx.userId,
        status: { not: ConnectionStatus.DISCONNECTED },
      },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        domain: true,
        status: true,
        connectedAt: true,
        expiresAt: true,
      },
    });
  }),

  /**
   * Connect a Bitrix24 portal via an inbound REST webhook URL (no OAuth app
   * required). The URL is verified live, then stored as a per-user WEBHOOK
   * portal that behaves like any other connected portal.
   */
  connectBitrixWebhook: authedProcedure
    .input(z.object({ webhookUrl: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await connectWebhook(ctx.userId, input.webhookUrl);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            err instanceof Error ? err.message : "Failed to connect webhook.",
        });
      }
    }),

  /** Disconnect a connected Bitrix24 portal (soft — keeps the row, flips status). */
  disconnectBitrixPortal: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const portal = await db.bitrixPortal.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });
      if (portal?.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      }
      await db.bitrixPortal.update({
        where: { id: input.id },
        data: { status: ConnectionStatus.DISCONNECTED },
      });
      return { id: input.id };
    }),

  /** Deal pipelines (categories) for a connected portal — for the Create Deal picker. */
  listBitrixDealCategories: authedProcedure
    .input(z.object({ portalId: z.string() }))
    .query(async ({ input, ctx }) => {
      const portal = await db.bitrixPortal.findUnique({
        where: { id: input.portalId },
        select: { userId: true },
      });
      if (portal?.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      }
      type Cat = { ID: string; NAME: string };
      const cats = await bitrixCall<Cat[]>(
        "crm.dealcategory.list",
        { order: { SORT: "ASC" }, select: ["ID", "NAME"] },
        { portalId: input.portalId },
      );
      return [
        { id: "0", name: "General (default)" },
        ...(cats ?? []).map((c) => ({ id: String(c.ID), name: c.NAME })),
      ];
    }),

  /** Stages within a deal pipeline — for the Create Deal stage picker. */
  listBitrixDealStages: authedProcedure
    .input(z.object({ portalId: z.string(), categoryId: z.string() }))
    .query(async ({ input, ctx }) => {
      const portal = await db.bitrixPortal.findUnique({
        where: { id: input.portalId },
        select: { userId: true },
      });
      if (portal?.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      }
      type Stage = { STATUS_ID: string; NAME: string };
      const stages = await bitrixCall<Stage[]>(
        "crm.dealcategory.stage.list",
        { id: Number(input.categoryId) || 0 },
        { portalId: input.portalId },
      );
      return (stages ?? []).map((s) => ({ statusId: s.STATUS_ID, name: s.NAME }));
    }),

});
