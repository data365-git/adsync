import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AdAccountsTable } from "~/components/ad-accounts/AdAccountsTable";

export const metadata = {
  title: "Ad Accounts | Automation Dashboard",
};

export default function AdAccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold tracking-tight">Ad Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Configure Facebook ad accounts and their sync schedules.
          </p>
        </div>
        <Button render={<Link href="/ad-accounts/new" />} className="shrink-0">
          <Plus className="size-4" aria-hidden />
          Add ad account
        </Button>
      </div>

      {/* Table / card list */}
      <AdAccountsTable />
    </div>
  );
}
