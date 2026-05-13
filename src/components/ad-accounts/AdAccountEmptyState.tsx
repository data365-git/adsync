import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

type Props = {
  hasFilters?: boolean;
  /** When provided, the primary CTA opens the create modal instead of
   *  navigating to /ad-accounts/new. */
  onAddClick?: () => void;
};

export function AdAccountEmptyState({ hasFilters = false, onAddClick }: Props) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-12 text-center sm:py-20">
        <div className="rounded-full bg-muted p-3">
          <LayoutGrid className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base">No matching ad accounts</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-12 text-center sm:py-20">
      <div className="rounded-full bg-muted p-3">
        <LayoutGrid className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base">No ad accounts configured</p>
        <p className="text-sm text-muted-foreground">
          Connect a Facebook ad account to start syncing data to Google Sheets.
        </p>
      </div>
      {onAddClick ? (
        // Modal path — preferred when the empty state is rendered inside the
        // /ad-accounts list (AdAccountsPageClient passes this callback).
        <Button
          type="button"
          size="default"
          onClick={onAddClick}
          aria-label="Add your first ad account"
        >
          <Plus className="size-4" aria-hidden />
          Add your first ad account
        </Button>
      ) : (
        // Fallback — navigates to the full-page form. Used in any context
        // where the page can't host a modal (e.g. legacy embeds).
        <Button size="default" render={<Link href="/ad-accounts/new" />}>
          <Plus className="size-4" aria-hidden />
          Add your first ad account
        </Button>
      )}
    </div>
  );
}
