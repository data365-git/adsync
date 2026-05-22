"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { AdAccountForm } from "./form/AdAccountForm";
import type { AdAccount } from "~/server/mocks/types";

interface AdAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "new" for create flow, "edit" + initialData for edit flow */
  mode: "new" | "edit";
  initialData?: AdAccount;
  /** Called after a successful save — typically used by the list to refetch + close */
  onSaved?: () => void;
}

export function AdAccountModal({
  open,
  onOpenChange,
  mode,
  initialData,
  onSaved,
}: AdAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,820px)] max-w-none rounded-lg border-slate-200 p-0 shadow-lg sm:max-w-none"
        showCloseButton
        aria-label={mode === "new" ? "Add ad account" : "Edit ad account"}
      >
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-base font-semibold text-slate-900">
            {mode === "new" ? "Add ad account" : "Edit ad account"}
          </DialogTitle>
          <p className="mt-0.5 text-sm text-slate-500">
            {mode === "new"
              ? "Connect a Facebook ad account and configure its sync schedule."
              : "Update this account's metrics, schedule, or destination tabs."}
          </p>
        </DialogHeader>

        {/* Body — scrolls when the form is long so the header stays visible */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <AdAccountForm
            mode={mode}
            initialData={initialData}
            onSuccess={() => {
              onSaved?.();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
