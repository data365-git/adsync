import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "~/server/auth";
import { exchangeCode } from "~/integrations/bitrix/oauth";

export const runtime = "nodejs";

/** Where to send the user after connecting — the page they started from, else /connections. */
async function resolveReturnTo(): Promise<string> {
  const jar = await cookies();
  const v = jar.get("bitrix_oauth_return")?.value;
  return v?.startsWith("/") ? v : "/connections";
}

/**
 * Bitrix24 OAuth callback. Exchanges the authorization code for tokens and
 * stores the portal (domain + member_id + encrypted tokens). The portal
 * identity comes from the token response, so one app handles any portal.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXTAUTH_URL ?? req.url),
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/connections?error=bitrix_invalid_code",
        process.env.NEXTAUTH_URL ?? req.url,
      ),
    );
  }

  const base = process.env.NEXTAUTH_URL ?? req.url;
  const returnTo = await resolveReturnTo();

  try {
    await exchangeCode(code, session.user.id);
    const sep = returnTo.includes("?") ? "&" : "?";
    const res = NextResponse.redirect(
      new URL(`${returnTo}${sep}success=bitrix`, base),
    );
    res.cookies.delete("bitrix_oauth_return");
    return res;
  } catch (err) {
    console.error("[bitrix/callback] token exchange failed:", err);
    const res = NextResponse.redirect(
      new URL("/connections?error=bitrix_oauth_failed", base),
    );
    res.cookies.delete("bitrix_oauth_return");
    return res;
  }
}
