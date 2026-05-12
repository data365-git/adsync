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
    <main
      id="main"
      tabIndex={-1}
      className="bg-background flex min-h-screen items-center justify-center p-6"
    >
      <div className="w-full max-w-[400px]">
        <div className="bg-card ring-foreground/10 rounded-xl p-8 shadow-sm ring-1">
          <div className="mb-6 text-center">
            <h1 className="text-card-foreground text-xl font-semibold tracking-tight">
              Sign in to Automation
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Access is restricted to approved accounts.
            </p>
          </div>

          <GoogleSignInButton />

          <p className="text-muted-foreground mt-6 text-center text-xs">
            By signing in you agree to let this app access your Google account
            data as described in the setup guide.
          </p>
        </div>
      </div>
    </main>
  );
}
