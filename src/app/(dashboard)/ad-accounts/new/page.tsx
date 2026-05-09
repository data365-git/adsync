import { type Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { AdAccountForm } from "~/components/ad-accounts/form/AdAccountForm";

export const metadata: Metadata = {
  title: "New Ad Account — Automation",
};

export default function NewAdAccountPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <Link
          href="/ad-accounts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Ad Accounts
        </Link>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          New Ad Account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect a Facebook Ad Account and configure what data to sync into
          Google Sheets.
        </p>
      </div>

      {/* Form */}
      <AdAccountForm mode="new" />
    </div>
  );
}
