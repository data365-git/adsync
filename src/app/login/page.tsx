import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <div className="bg-card text-card-foreground border-border w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This page is a Stage 0 placeholder. Settings-Login-Agent will replace
          it in Stage 1.
        </p>
        <Link
          href="/connections"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium"
        >
          Continue to dashboard
        </Link>
      </div>
    </main>
  );
}
