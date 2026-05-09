import Link from "next/link";
import { Zap } from "lucide-react";

/**
 * Informational banner linking to /ad-accounts for Quick Setup scenarios.
 * Deliberately muted — this is navigation aid, not a CTA.
 * bg-muted/50 card with text-muted-foreground keeps it secondary to the custom list.
 */
export function QuickSetupBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3">
      <div className="shrink-0 rounded-md bg-muted p-2">
        <Zap className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">Quick Setup scenarios</p>
        <p className="text-xs text-muted-foreground">
          Quick Setup scenarios are auto-generated from your{" "}
          <Link
            href="/ad-accounts"
            className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Ad Accounts
          </Link>
          . Edit them there, or use the filter below to show them in this list.
        </p>
      </div>
    </div>
  );
}
