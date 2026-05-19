import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { exchangeCode } from "~/integrations/google/oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/connections?error=google_denied", process.env.NEXTAUTH_URL ?? req.url),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/connections?error=google_invalid", process.env.NEXTAUTH_URL ?? req.url),
    );
  }

  // Validate that the userId in state matches the current session
  const [stateUserId] = state.split(":");
  if (stateUserId !== session.user.id) {
    return NextResponse.redirect(
      new URL("/connections?error=google_state_mismatch", process.env.NEXTAUTH_URL ?? req.url),
    );
  }

  try {
    await exchangeCode(code, session.user.id);
    return NextResponse.redirect(
      new URL("/connections?success=google", process.env.NEXTAUTH_URL ?? req.url),
    );
  } catch (err) {
    console.error("[Google OAuth callback error]", err);
    return NextResponse.redirect(
      new URL("/connections?error=google_exchange_failed", process.env.NEXTAUTH_URL ?? req.url),
    );
  }
}
