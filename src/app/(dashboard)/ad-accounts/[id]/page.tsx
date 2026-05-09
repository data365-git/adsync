import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, AlertCircleIcon } from "lucide-react";
import { createCaller } from "~/server/api/root";
import { AdAccountForm } from "~/components/ad-accounts/form/AdAccountForm";
import { Button } from "~/components/ui/button";

interface EditAdAccountPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditAdAccountPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = createCaller({ headers: new Headers() });
    const account = await caller.adAccounts.getById({ id });
    return { title: `${account.label} — Automation` };
  } catch {
    return { title: "Ad Account — Automation" };
  }
}

export default async function EditAdAccountPage({
  params,
}: EditAdAccountPageProps) {
  const { id } = await params;

  let account;
  let loadError: string | null = null;

  const caller = createCaller({ headers: new Headers() });
  try {
    account = await caller.adAccounts.getById({ id });
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Failed to load ad account.";
  }

  if (loadError || !account) {
    // Show error state — keep breadcrumb visible
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <nav aria-label="Breadcrumb">
          <Link
            href="/ad-accounts"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Ad Accounts
          </Link>
        </nav>

        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircleIcon className="size-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              Failed to load ad account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loadError ?? "Ad account not found."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/ad-accounts">
              <Button variant="outline">Back to list</Button>
            </Link>
            {/* Retry by reloading the page — simplest approach without JS routing */}
            <form
              action=""
              method="get"
            >
              <Button type="submit">Retry</Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 404 if account doesn't exist at all (handled by error above, but be explicit)
  if (account.id !== id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              href="/ad-accounts"
              className="transition-colors hover:text-foreground"
            >
              Ad Accounts
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronLeftIcon className="size-3.5 rotate-180" />
          </li>
          <li
            className="max-w-[200px] truncate text-foreground"
            aria-current="page"
          >
            {account.label}
          </li>
        </ol>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {account.label}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the configuration for this Facebook Ad Account sync.
        </p>
      </div>

      {/* Form — passes initial data from the server */}
      <AdAccountForm mode="edit" initialData={account} />
    </div>
  );
}
