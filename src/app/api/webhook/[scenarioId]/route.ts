import { timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { executeRun } from "~/server/core/executor";
import { db } from "~/server/db";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256 * 1024;

function isSecretMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function collectWebhookHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    const normalized = key.toLowerCase();
    if (normalized.startsWith("x-") && normalized !== "x-webhook-secret") {
      result[key] = value;
    }
  }
  return result;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> },
) {
  const { scenarioId } = await params;
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      userId: true,
      webhookSecret: true,
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (
    !scenario.webhookSecret ||
    !isSecretMatch(providedSecret, scenario.webhookSecret)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body_too_large" }, { status: 400 });
  }

  let rawBody: ArrayBuffer;
  try {
    rawBody = await req.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (rawBody.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body_too_large" }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(Buffer.from(rawBody).toString("utf8")) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const triggerPayload = {
    receivedAt: new Date().toISOString(),
    method: "POST" as const,
    headers: collectWebhookHeaders(req.headers),
    body: parsedBody,
  };

  const runId = await executeRun(scenarioId, "MANUAL", scenario.userId, {
    webhookTriggerPayload: triggerPayload,
  });

  return NextResponse.json({ ok: true, runId });
}
