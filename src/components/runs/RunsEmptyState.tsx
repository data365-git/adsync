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
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <SearchX
          className="size-10 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-foreground">No runs match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting the account or status filters.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <Inbox
        className="size-10 text-muted-foreground"
        aria-hidden="true"
      />
      <div>
        <p className="font-medium text-foreground">No runs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Trigger a manual run from the Ad Accounts page.
        </p>
      </div>
      <Button variant="default" size="sm" render={<Link href="/ad-accounts" />}>
        Go to Ad Accounts
      </Button>
    </div>
  );
}
