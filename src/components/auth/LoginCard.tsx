"use client";

import Link from "next/link";

/**
 * Google "G" logo — inline SVG, no external CDN.
 * Colors match Google brand guidelines exactly.
 */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginCard() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px]">
        {/* Card */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 shadow-sm">
          {/* Heading */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              Sign in to Automation
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access is restricted to approved accounts.
            </p>
          </div>

          {/*
           * In Phase 1 (mock), clicking "Sign in with Google" goes straight
           * to the dashboard. Phase 2 will replace this Link with the real
           * NextAuth signIn() call.
           */}
          <Link
            href="/connections"
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#4285F4] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/60 focus-visible:ring-offset-2 active:opacity-80"
            aria-label="Sign in with Google"
          >
            {/* White Google "G" — placed on blue so the multi-color logo
                is not visible on hover; match Google's own button style */}
            <span className="flex size-5 items-center justify-center rounded-sm bg-white p-0.5">
              <GoogleLogo className="size-4" />
            </span>
            Sign in with Google
          </Link>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in you agree to let this app access your Google account
            data as described in the setup guide.
          </p>
        </div>
      </div>
    </main>
  );
}
