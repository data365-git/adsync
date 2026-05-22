"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { DeleteDataDialog } from "./DeleteDataDialog";

export function DangerZone() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Card
      aria-labelledby="danger-zone-heading"
      className="rounded-lg border border-red-200 bg-white py-5 text-slate-950 shadow-none ring-0"
    >
      <CardHeader className="gap-1 px-5">
        <CardTitle
          id="danger-zone-heading"
          className="text-lg font-semibold leading-7 text-red-700"
        >
          Danger zone
        </CardTitle>
        <CardDescription className="text-sm font-normal leading-5 text-slate-500">
          Irreversible actions that affect all your data.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex min-h-16 flex-col gap-3 rounded-md border border-red-100 bg-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium leading-5 text-slate-900">
              Delete all data
            </p>
            <p className="text-xs leading-4 text-slate-500">
              Permanently removes all ad accounts, runs, and logs.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            className="h-9 shrink-0 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
            aria-haspopup="dialog"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete all data
          </Button>
        </div>

        <DeleteDataDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </CardContent>
    </Card>
  );
}
