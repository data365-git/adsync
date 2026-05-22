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
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center sm:py-20">
        <div className="rounded-full bg-slate-100 p-3">
          <LayoutGrid className="size-6 text-slate-500" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">
            No matching ad accounts
          </h2>
          <p className="text-sm text-slate-500">
            Try adjusting your filters or search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center sm:py-20">
      <div className="rounded-full bg-slate-100 p-3">
        <LayoutGrid className="size-6 text-slate-500" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">
          No ad accounts configured
        </h2>
        <p className="text-sm text-slate-500">
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
          className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden />
          Add your first ad account
        </Button>
      ) : (
        // Fallback — navigates to the full-page form. Used in any context
        // where the page can't host a modal (e.g. legacy embeds).
        <Button
          size="default"
          render={<Link href="/ad-accounts/new" />}
          className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden />
          Add your first ad account
        </Button>
      )}
    </div>
  );
}
