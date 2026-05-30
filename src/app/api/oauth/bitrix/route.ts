import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "~/server/auth";
import {
  getAuthorizationUrl,
  normalizePortalDomain,
} from "~/integrations/bitrix/oauth";

export const runtime = "nodejs";

/**
 * Start the Bitrix24 OAuth flow. The portal to authorize comes from `?portal=`
 * (a user-entered domain — for connecting any portal), falling back to the
 * portal in BITRIX24_WEBHOOK_URL (the local app's own portal). The user logs
 * into that portal and approves; Bitrix redirects to /callback with a code.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXTAUTH_URL ?? req.url),
    );
  }

  const portalParam = req.nextUrl.searchParams.get("portal");
  let portal = portalParam ? normalizePortalDomain(portalParam) : "";
  if (!portal && process.env.BITRIX24_WEBHOOK_URL) {
    try {
      portal = new URL(process.env.BITRIX24_WEBHOOK_URL).hostname;
    } catch {
      portal = "";
    }
  }
  if (!portal) {
    return NextResponse.redirect(
      new URL(
        "/connections?error=bitrix_no_portal",
        process.env.NEXTAUTH_URL ?? req.url,
      ),
    );
  }

  const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;
  let authUrl: string;
  try {
    authUrl = getAuthorizationUrl(portal, state);
  } catch {
    // OAuth app not configured (BITRIX24_CLIENT_ID/SECRET unset). Degrade
    // gracefully instead of throwing — multi-user connects via webhook, so a
    // missing OAuth app must never take down the route / fail the deploy.
    return NextResponse.redirect(
      new URL(
        "/connections?error=bitrix_not_configured",
        process.env.NEXTAUTH_URL ?? req.url,
      ),
    );
  }
  const res = NextResponse.redirect(authUrl);

  // Remember where to send the user back after consent (e.g. the scenario
  // builder they started from). Only same-origin paths are honored.
  const returnTo = req.nextUrl.searchParams.get("returnTo");
  if (returnTo?.startsWith("/")) {
    res.cookies.set("bitrix_oauth_return", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }
  return res;
}
