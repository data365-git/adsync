import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getAuthorizationUrl } from "~/integrations/google/oauth";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect("/login");

  const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;
  const url = getAuthorizationUrl(state);
  return NextResponse.redirect(url);
}
