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
    return { title: `${account.label} — adsync` };
  } catch {
    return { title: "Ad Account — adsync" };
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
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ChevronLeftIcon className="size-4" />
            Ad Accounts
          </Link>
        </nav>

        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircleIcon className="size-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-red-900">
              Failed to load ad account
            </h2>
            <p className="mt-1 text-sm text-red-700">
              {loadError ?? "Ad account not found."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/ad-accounts">
              <Button
                variant="outline"
                className="h-9 rounded-md border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
              >
                Back to list
              </Button>
            </Link>
            {/* Retry by reloading the page — simplest approach without JS routing */}
            <form
              action=""
              method="get"
            >
              <Button
                type="submit"
                className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
              >
                Retry
              </Button>
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
        <ol className="flex items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link
              href="/ad-accounts"
              className="transition-colors hover:text-slate-900"
            >
              Ad Accounts
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronLeftIcon className="size-3.5 rotate-180" />
          </li>
          <li
            className="max-w-[200px] truncate text-slate-900"
            aria-current="page"
          >
            {account.label}
          </li>
        </ol>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {account.label}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Edit the configuration for this Facebook Ad Account sync.
        </p>
      </div>

      {/* Form — passes initial data from the server */}
      <AdAccountForm mode="edit" initialData={account} />
    </div>
  );
}
