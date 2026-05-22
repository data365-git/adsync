import { type Metadata } from "next";
import { api, HydrateClient } from "~/trpc/server";
import { RunsClient } from "~/components/runs/RunsClient";

export const metadata: Metadata = {
  title: "Runs",
};

export default async function RunsPage() {
  // Prefetch the first page on the server so the client receives hydrated data immediately
  void api.runs.list.prefetch({ page: 1, pageSize: 10 });

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Sync Runs</h1>
          <p className="text-sm text-slate-500">
            History of all Facebook Ads sync runs across your ad accounts.
          </p>
        </div>
        <RunsClient />
      </div>
    </HydrateClient>
  );
}
