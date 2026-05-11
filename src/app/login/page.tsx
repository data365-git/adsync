import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { AllowlistGate } from "~/components/auth/AllowlistGate";
import { GoogleSignInButton } from "./GoogleSignInButton";

/**
 * /login — Auth entry point.
 *
 * Phase 2: uses real NextAuth auth() to determine session state.
 *
 * - Already authenticated → redirect to /connections.
 * - NextAuth returned error=AccessDenied → AllowlistGate.
 * - Not authenticated → login card with real Google signIn().
 *
 * The page lives outside (dashboard) so it has no Sidebar / TopBar.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/connections");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  // NextAuth sends error=AccessDenied when the signIn callback returns false.
  if (error === "AccessDenied") {
    return <AllowlistGate />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              Sign in to Automation
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access is restricted to approved accounts.
            </p>
          </div>

          <GoogleSignInButton />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in you agree to let this app access your Google account
            data as described in the setup guide.
          </p>
        </div>
      </div>
    </main>
  );
}
