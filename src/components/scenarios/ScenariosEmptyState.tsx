import Link from "next/link";
import { Workflow } from "lucide-react";
import { Button } from "~/components/ui/button";

type Props = {
  /** true when filters are applied but yielded no results */
  hasFilters: boolean;
  onClearFilters?: () => void;
};

/**
 * Two distinct empty states:
 * - No scenarios at all → onboarding CTAs (template + scratch), equal weight
 * - Filters applied, zero results → single "Clear filters" action
 */
export function ScenariosEmptyState({ hasFilters, onClearFilters }: Props) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-3">
          <Workflow className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">No scenarios match your filters</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting or clearing your current filters.
          </p>
        </div>
        <Button variant="outline" size="default" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <Workflow className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">You haven&apos;t built any scenarios yet</p>
        <p className="text-sm text-muted-foreground">
          Choose a template to get started quickly, or build your own from scratch.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="default"
          size="default"
          render={<Link href="/scenarios/new?from=template" />}
        >
          Start from a template
        </Button>
        <Button
          variant="outline"
          size="default"
          render={<Link href="/scenarios/new" />}
        >
          Build from scratch
        </Button>
      </div>
    </div>
  );
}
