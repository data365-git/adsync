import { db } from "~/server/db";

export type FailedRunContext = {
  userId: string;
  runId: string;
  scenarioId: string;
  scenarioName: string;
  errorMessage: string;
  durationMs: number;
};

const WEBHOOK_TIMEOUT_MS = 5_000;

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function isInQuietHours(
  start: string | null,
  end: string | null,
  now = new Date(),
): boolean {
  if (!start || !end) return false;

  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

async function postWithTimeout(url: string, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function writeNotificationLog(
  ctx: FailedRunContext,
  channel: string,
  status: "SUCCESS" | "ERROR",
  errorMessage?: string,
): Promise<void> {
  await db.notificationLog.create({
    data: {
      userId: ctx.userId,
      channel,
      runId: ctx.runId,
      scenarioId: ctx.scenarioId,
      status,
      errorMessage: errorMessage ?? null,
    },
  });
}

async function postGeneric(url: string, ctx: FailedRunContext): Promise<void> {
  try {
    await postWithTimeout(url, ctx);
    await writeNotificationLog(ctx, "generic", "SUCCESS");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await writeNotificationLog(ctx, "generic", "ERROR", errorMessage);
    throw error;
  }
}

export async function notifyOnFailure(ctx: FailedRunContext): Promise<void> {
  const settings = await db.userSettings.findUnique({
    where: { userId: ctx.userId },
    select: {
      genericWebhookUrl: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });

  if (!settings) return;
  if (isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) return;

  const jobs: Array<Promise<void>> = [];
  if (settings.genericWebhookUrl) {
    jobs.push(postGeneric(settings.genericWebhookUrl, ctx));
  }

  await Promise.allSettled(jobs);
}
