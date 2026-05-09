import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

type Props = {
  hasFilters?: boolean;
};

export function AdAccountEmptyState({ hasFilters = false }: Props) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-3">
          <LayoutGrid className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">No matching ad accounts</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <LayoutGrid className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">No ad accounts configured</p>
        <p className="text-sm text-muted-foreground">
          Connect a Facebook ad account to start syncing data to Google Sheets.
        </p>
      </div>
      <Button size="default" render={<Link href="/ad-accounts/new" />}>
        <Plus className="size-4" aria-hidden />
        Add your first ad account
      </Button>
    </div>
  );
}
