"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import type { AdAccountCardAccount } from "./AdAccountCard";
import { healthDot, type HealthDot } from "./health";

type Props = {
  account: AdAccountCardAccount | null;
  onClose: () => void;
};

const statusClasses: Record<HealthDot, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function statusLabel(status: HealthDot) {
  if (status === "green") return "Fresh";
  if (status === "amber") return "Stale";
  return "Needs sync";
}

export function AdAccountDetailDrawer({ account, onClose }: Props) {
  const runsQuery = api.runs.list.useQuery(
    { adAccountId: account?.id ?? "", pageSize: 10, page: 1 },
    { enabled: !!account },
  );
  const scenariosQuery = api.scenarios.list.useQuery(
    { includeQuickSetup: true, scope: "all" },
    { enabled: !!account },
  );

  const status = healthDot(account?.lastSyncedAt);
  const scenarios =
    scenariosQuery.data?.filter(
      (scenario) =>
        (scenario as { adAccountId?: string | null }).adAccountId ===
        account?.id,
    ) ?? [];

  return (
    <Sheet open={!!account} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-xl"
      >
        {account ? (
          <>
            <SheetHeader className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4 pr-10">
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg text-slate-900">
                    {account.label}
                  </SheetTitle>
                  <p className="mt-1 truncate font-mono text-sm text-slate-500">
                    {account.fbAccountId}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs font-medium",
                    statusClasses[status],
                  )}
                >
                  {statusLabel(status)}
                </span>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-6">
              <section>
                <h3 className="text-sm font-medium text-slate-900">Stats</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    ["Spend 7d", "—"],
                    ["Spend 30d", "—"],
                    ["Active campaigns", "—"],
                    ["Last synced", formatDate(account.lastSyncedAt)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-medium text-slate-900">
                  Sync history
                </h3>
                <div className="mt-3 space-y-2">
                  {runsQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading runs…</p>
                  ) : (runsQuery.data?.runs.length ?? 0) > 0 ? (
                    runsQuery.data?.runs.slice(0, 10).map((run) => (
                      <Link
                        key={run.id}
                        href={`/runs/${run.id}`}
                        className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
                      >
                        <span className="text-slate-700">
                          {run.scenarioName ?? run.scenarioId}
                        </span>
                        <span className="text-xs text-slate-500">
                          {run.status}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">
                      No runs yet.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-slate-900">
                  Scenarios using it
                </h3>
                <div className="mt-3 space-y-2">
                  {scenariosQuery.isLoading ? (
                    <p className="text-sm text-slate-500">
                      Loading scenarios…
                    </p>
                  ) : scenarios.length > 0 ? (
                    scenarios.map((scenario) => (
                      <Link
                        key={scenario.id}
                        href={`/scenarios/${scenario.id}`}
                        className="block rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
                      >
                        {scenario.name}
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">
                      No linked scenarios found in the current list response.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-slate-900">
                  Raw config
                </h3>
                <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-700">
                  {JSON.stringify(account, null, 2)}
                </pre>
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
