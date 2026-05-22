import { ExternalLink, TableProperties } from "lucide-react";

import { Button } from "~/components/ui/button";

interface RunSheetsLinkProps {
  sheetsUrl: string;
}

// Shown only when run.sheetsUrl !== null (caller is responsible for the guard).
// Opens in a new tab with proper rel attributes.
export function RunSheetsLink({ sheetsUrl }: RunSheetsLinkProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Use render prop (not asChild) per Stage 1 Base UI conventions */}
      <Button
        variant="default"
        size="default"
        render={
          <a
            href={sheetsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View results in Google Sheets (opens in new tab)"
          />
        }
        className="h-9 gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
      >
        <TableProperties className="size-4 shrink-0" aria-hidden="true" />
        View in Google Sheets
        <ExternalLink
          className="size-3.5 shrink-0 opacity-70"
          aria-hidden="true"
        />
      </Button>
    </div>
  );
}
