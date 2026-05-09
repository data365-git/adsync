import { api, HydrateClient } from "~/trpc/server";
import { ConnectionsClient } from "~/components/connections/ConnectionsClient";

export const metadata = {
  title: "Connections",
};

export default async function ConnectionsPage() {
  // Prefetch on the server so the client receives hydrated data immediately
  void api.connections.list.prefetch();

  return (
    <HydrateClient>
      <ConnectionsClient />
    </HydrateClient>
  );
}
