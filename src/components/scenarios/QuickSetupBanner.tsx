import Link from "next/link";
import { Zap } from "lucide-react";

/**
 * Informational banner linking to /ad-accounts for Quick Setup scenarios.
 * Deliberately muted — this is navigation aid, not a CTA.
 * bg-muted/50 card with text-muted-foreground keeps it secondary to the custom list.
 */
export function QuickSetupBanner() {
  return (
    <div className="bg-muted/50 flex items-center gap-3 rounded-xl border px-4 py-3">
      <div className="bg-muted shrink-0 rounded-md p-2">
        <Zap className="text-muted-foreground size-4" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-foreground text-sm font-medium">
          Quick Setup scenarios
        </p>
        <p className="text-muted-foreground text-xs">
          Quick Setup scenarios are auto-generated from your{" "}
          <Link
            href="/ad-accounts"
            className="hover:text-foreground focus-visible:ring-ring rounded underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
          >
            Ad Accounts
          </Link>
          . Edit them there, or use the filter below to show them in this list.
        </p>
      </div>
    </div>
  );
}
