import { z } from "zod";
import { createTRPCRouter, authedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  drainSyncJobs,
  retryFailedJobs,
} from "~/server/sync/orchestrator";

export const syncRouter = createTRPCRouter({
  /**
   * Return queue depth, last sync timestamp, and error rate for the monitoring dashboard.
   */
  status: authedProcedure.query(async () => {
    const [pending, failed, done, lastLog, totalAttempts, errorCount] =
      await Promise.all([
        db.syncJob.count({ where: { status: "pending" } }),
        db.syncJob.count({ where: { status: "failed" } }),
        db.syncJob.count({ where: { status: "done" } }),
        db.syncLog.findFirst({ orderBy: { createdAt: "desc" } }),
        db.syncLog.count(),
        db.syncLog.count({ where: { success: false } }),
      ]);

    return {
      queueDepth: pending,
      failedJobs: failed,
      completedJobs: done,
      lastSyncAt: lastLog?.createdAt ?? null,
      errorRate: totalAttempts > 0 ? errorCount / totalAttempts : 0,
    };
  }),

  /**
   * Enqueue a full re-sync for every record of the given entity type.
   * Safe to call repeatedly — the sync functions are idempotent.
   */
  triggerManual: authedProcedure
    .input(z.object({ entity: z.enum(["Lead", "Deal", "Contact"]) }))
    .mutation(async ({ input }) => {
      type Row = { id: string };
      let rows: Row[];

      if (input.entity === "Lead") {
        rows = await db.lead.findMany({ select: { id: true } });
      } else if (input.entity === "Deal") {
        rows = await db.deal.findMany({ select: { id: true } });
      } else {
        rows = await db.contact.findMany({ select: { id: true } });
      }

      if (rows.length === 0) return { enqueued: 0 };

      await db.syncJob.createMany({
        data: rows.map((r) => ({
          entity: input.entity,
          entityId: r.id,
          operation: "upsert",
          payload: {},
          status: "pending",
        })),
      });

      // Drain immediately so the caller sees fast feedback
      const { processed, failed } = await drainSyncJobs();

      return { enqueued: rows.length, processed, failed };
    }),

  /**
   * Re-queue all failed jobs that are within the retry budget.
   */
  retryFailed: authedProcedure.mutation(async () => {
    const requeued = await retryFailedJobs();
    const { processed, failed } = await drainSyncJobs();
    return { requeued, processed, failed };
  }),
});
