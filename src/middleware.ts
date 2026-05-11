import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

const PROTECTED_PREFIXES = [
  "/connections",
  "/scenarios",
  "/runs",
  "/ad-accounts",
  "/settings",
];

// NextAuth v5: auth() can be used directly as middleware by passing a callback.
// The callback receives the standard NextRequest augmented with a `auth` field
// that is the Session or null.
export default auth(
  (req: NextRequest & { auth: Session | null }) => {
    const { nextUrl } = req;
    const isAuthenticated = req.auth !== null;

    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
      nextUrl.pathname.startsWith(prefix),
    );

    if (isProtected && !isAuthenticated) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("next", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
);

export const config = {
  matcher: [
    // Exclude api routes, static assets, and favicon from middleware.
    "/((?!api|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
