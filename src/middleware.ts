import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/connections",
  "/scenarios",
  "/runs",
  "/settings",
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) return NextResponse.next();

  const isSecure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
    salt: cookieName,
    secureCookie: isSecure,
  });

  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};
