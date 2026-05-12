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
      {/* gap-6 / space-y-6 (24 px) = standard page rhythm; space-y-8 (32 px) = data-dense detail pages & multi-section forms */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sync Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            History of all Facebook Ads sync runs across your ad accounts.
          </p>
        </div>
        <RunsClient />
      </div>
    </HydrateClient>
  );
}
