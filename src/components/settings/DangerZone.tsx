"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { DeleteDataDialog } from "./DeleteDataDialog";

export function DangerZone() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="rounded-xl border border-error/40 p-6"
    >
      <h2
        id="danger-zone-heading"
        className="mb-1 text-sm font-semibold text-error"
      >
        Danger zone
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Irreversible actions that affect all your data.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Delete all data</p>
          <p className="text-xs text-muted-foreground">
            Permanently removes all ad accounts, runs, and logs.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDialogOpen(true)}
          className="shrink-0"
          aria-haspopup="dialog"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete all data
        </Button>
      </div>

      <DeleteDataDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}
