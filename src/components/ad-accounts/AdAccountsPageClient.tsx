"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { AdAccountsTable } from "./AdAccountsTable";
import { AdAccountModal } from "./AdAccountModal";

export function AdAccountsPageClient() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const utils = api.useUtils();

  // Use the same query that AdAccountsTable consumes — React Query dedupes,
  // so this isn't a second network call. We just need to know if the list is
  // empty in order to hide the top-right "Add" button when the empty state's
  // own CTA is the only call-to-action that should be visible.
  const { data, isLoading } = api.adAccounts.list.useQuery();

  // Hide the header button while loading (avoids a flash) and when the list
  // is empty (the empty-state has its own primary CTA). Show it as soon as we
  // know there's at least one account.
  const showHeaderAddButton = !isLoading && (data?.length ?? 0) > 0;

  const openCreate = React.useCallback(() => setCreateOpen(true), []);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header — typography mirrors the Scenarios page for visual parity */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-medium tracking-tight">Ad Accounts</h1>
          <p className="text-base text-muted-foreground">
            Configure Facebook ad accounts and their sync schedules.
          </p>
        </div>
        {showHeaderAddButton && (
          <Button
            type="button"
            onClick={openCreate}
            className="shrink-0"
          >
            <Plus className="size-4" aria-hidden />
            Add ad account
          </Button>
        )}
      </div>

      {/* Table / card list — empty-state CTA also opens the create modal */}
      <AdAccountsTable onAddClick={openCreate} />

      {/* Create-account modal */}
      <AdAccountModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="new"
        onSaved={() => {
          void utils.adAccounts.list.invalidate();
        }}
      />
    </div>
  );
}
