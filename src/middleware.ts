import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

const protectedPrefixes = [
  "/connections",
  "/scenarios",
  "/runs",
  "/ad-accounts",
  "/settings",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtectedPath = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtectedPath && !req.auth) {
    return NextResponse.redirect(
      new URL("/login?next=" + encodeURIComponent(pathname), req.url),
    );
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};
