// MOCK initiator — Phase 4 wires the real Bitrix24 OAuth.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "~/server/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Skip the real OAuth dance entirely. Bounce straight to the mock callback
  // with a synthetic code. Real consent flow lands in Phase 4.
  const state = randomBytes(16).toString("hex");
  const callbackUrl = new URL("/api/oauth/bitrix/callback", req.url);
  callbackUrl.searchParams.set("code", `mock-bitrix-${randomBytes(16).toString("hex")}`);
  callbackUrl.searchParams.set("state", state);

  return NextResponse.redirect(callbackUrl);
}
