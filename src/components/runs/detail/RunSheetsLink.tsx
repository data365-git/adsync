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
        className="focus-visible:ring-ring gap-2 bg-[#1a7f4b] text-white hover:bg-[#166d3f] dark:bg-[#1a7f4b] dark:hover:bg-[#166d3f]"
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
