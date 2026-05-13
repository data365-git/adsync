import "server-only";
import { db } from "~/server/db";
import { syncLead, syncDeal, syncContact } from "~/server/bitrix24/sync";

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;

async function executeJob(jobId: string, entity: string, entityId: string): Promise<void> {
  if (entity === "Lead") {
    const lead = await db.lead.findUniqueOrThrow({ where: { id: entityId } });
    await syncLead(lead, jobId);
  } else if (entity === "Deal") {
    const deal = await db.deal.findUniqueOrThrow({ where: { id: entityId } });
    await syncDeal(deal, jobId);
  } else if (entity === "Contact") {
    const contact = await db.contact.findUniqueOrThrow({ where: { id: entityId } });
    await syncContact(contact, jobId);
  } else {
    throw new Error(`Unknown entity type: ${entity}`);
  }
}

/**
 * Pull pending SyncJob rows (up to BATCH_SIZE), execute each, mark done or failed.
 *
 * @returns Counts of processed and failed jobs in this drain pass
 */
export async function drainSyncJobs(): Promise<{ processed: number; failed: number }> {
  const jobs = await db.syncJob.findMany({
    where: { status: "pending" },
    orderBy: { scheduledAt: "asc" },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    await db.syncJob.update({
      where: { id: job.id },
      data: { status: "running", attempts: { increment: 1 } },
    });

    try {
      await executeJob(job.id, job.entity, job.entityId);
      await db.syncJob.update({
        where: { id: job.id },
        data: { status: "done", completedAt: new Date() },
      });
      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await db.syncJob.update({
        where: { id: job.id },
        data: { status: "failed", lastError: errorMsg },
      });

      // SyncLog is written inside syncLead/syncDeal/syncContact on error.
      // Write a top-level log entry here only if the job itself failed before reaching sync.
      await db.syncLog.create({
        data: {
          jobId: job.id,
          entity: job.entity,
          bitrixId: null,
          direction: "to_bitrix",
          success: false,
          request: (job.payload as object) ?? {},
          response: {},
          error: errorMsg,
          duration: 0,
        },
      });

      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Re-queue failed SyncJob rows that are within retry budget and past their backoff window.
 * Backoff: min(1000 * 2^attempts, 60_000) ms after createdAt.
 *
 * @returns Number of jobs re-queued to "pending"
 */
export async function retryFailedJobs(): Promise<number> {
  const now = new Date();
  const jobs = await db.syncJob.findMany({
    where: { status: "failed", attempts: { lt: MAX_ATTEMPTS } },
    take: BATCH_SIZE,
  });

  let retried = 0;

  for (const job of jobs) {
    const backoffMs = Math.min(1_000 * 2 ** job.attempts, 60_000);
    const retryAfter = new Date(job.createdAt.getTime() + backoffMs);
    if (retryAfter > now) continue;

    await db.syncJob.update({
      where: { id: job.id },
      data: { status: "pending" },
    });
    retried++;
  }

  return retried;
}
