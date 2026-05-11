"use client";

import * as React from "react";

interface FbListAdAccountsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function FbListAdAccountsConfig({
  // config and onChange unused — no fields to edit
  config: _config,
  onChange: _onChange,
  errors: _errors,
}: FbListAdAccountsConfigProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">
          Returns up to 25 ad accounts. Real data requires a connected Facebook
          account (Phase 4).
        </p>
      </div>
    </div>
  );
}
