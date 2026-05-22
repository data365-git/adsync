import Link from "next/link";
import { Inbox, SearchX } from "lucide-react";
import { Button } from "~/components/ui/button";

interface RunsEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function RunsEmptyState({
  hasFilters,
  onClearFilters,
}: RunsEmptyStateProps) {
  if (hasFilters) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      >
        <SearchX
          className="size-10 text-slate-400"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            No runs match your filters
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting the account or status filters.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-9 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 py-12 text-center"
    >
      <Inbox
        className="size-10 text-slate-400"
        aria-hidden="true"
      />
      <div>
        <h2 className="text-lg font-semibold text-slate-900">No runs yet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Trigger a manual run from the Ad Accounts page.
        </p>
      </div>
      <Button
        variant="default"
        size="sm"
        render={<Link href="/ad-accounts" />}
        className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
      >
        Go to Ad Accounts
      </Button>
    </div>
  );
}
