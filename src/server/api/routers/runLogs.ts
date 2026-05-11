/**
 * RunLogs tRPC router — Phase 2 real-DB implementation.
 *
 * NOTE: authedProcedure is provided by Agent A post-merge.
 * Using publicProcedure as stand-in until then.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "~/server/db";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { RunLog as MockRunLog } from "~/server/mocks/types";

// merge-time: swap publicProcedure for authedProcedure from "~/server/api/trpc"
const authedProcedure = publicProcedure;

// ── Router ────────────────────────────────────────────────────────────────────

export const runLogsRouter = createTRPCRouter({
  byRunId: authedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = (ctx as { userId?: string }).userId ?? "dev";

      // Verify run ownership before returning logs
      const run = await db.run.findUnique({ where: { id: input.runId } });
      if (run?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Run ${input.runId} not found`,
        });
      }

      const logs = await db.runLog.findMany({
        where: { runId: input.runId },
        orderBy: { ts: "asc" },
      });

      return logs.map(
        (l): MockRunLog => ({
          id: l.id,
          runId: l.runId,
          level: l.level,
          message: l.message,
          meta: l.meta as Record<string, unknown> | null,
          timestamp: l.ts,
        }),
      );
    }),
});
