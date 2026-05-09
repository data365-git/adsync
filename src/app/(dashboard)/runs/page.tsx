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
        <div>
          <h1 className="text-xl font-semibold">Sync Runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            History of all Facebook Ads sync runs across your ad accounts.
          </p>
        </div>
        <RunsClient />
      </div>
    </HydrateClient>
  );
}
