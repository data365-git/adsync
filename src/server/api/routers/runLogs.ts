import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "~/server/db";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";
import type { RunLog as MockRunLog } from "~/server/mocks/types";

// ── Router ────────────────────────────────────────────────────────────────────

export const runLogsRouter = createTRPCRouter({
  byRunId: authedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;

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
