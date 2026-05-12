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
      className="border-destructive/40 rounded-xl border p-6"
    >
      <h2
        id="danger-zone-heading"
        className="text-destructive mb-1 text-sm font-semibold"
      >
        Danger zone
      </h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Irreversible actions that affect all your data.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-foreground text-sm font-medium">Delete all data</p>
          <p className="text-muted-foreground text-xs">
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
