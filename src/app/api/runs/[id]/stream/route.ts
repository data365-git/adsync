import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "~/server/db";

export const runtime = "nodejs";

function getAuthCookieOptions() {
  const isSecure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  return { cookieName, isSecure };
}

function serializeSseData(value: unknown): string {
  return `data: ${JSON.stringify(value)}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { cookieName, isSecure } = getAuthCookieOptions();
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
    salt: cookieName,
    secureCookie: isSecure,
  });
  const userId = typeof token?.id === "string" ? token.id : null;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const run = await db.run.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });

  if (run?.userId !== userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;
      let lastTs = new Date(0);
      const sentIds = new Set<string>();

      const close = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(interval);
        controller.close();
      };

      const poll = async () => {
        if (isClosed) return;

        try {
          const [latestRun, logs] = await Promise.all([
            db.run.findUnique({
              where: { id },
              select: { status: true },
            }),
            db.runLog.findMany({
              where: {
                runId: id,
                ts: { gte: lastTs },
              },
              orderBy: { ts: "asc" },
            }),
          ]);

          for (const log of logs) {
            if (sentIds.has(log.id)) continue;
            sentIds.add(log.id);
            lastTs = log.ts > lastTs ? log.ts : lastTs;
            controller.enqueue(encoder.encode(serializeSseData(log)));
          }

          if (latestRun?.status !== "RUNNING") {
            close();
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              serializeSseData({
                level: "ERROR",
                message:
                  error instanceof Error ? error.message : "Stream failed",
              }),
            ),
          );
          close();
        }
      };

      const interval = setInterval(() => void poll(), 500);
      void poll();
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
