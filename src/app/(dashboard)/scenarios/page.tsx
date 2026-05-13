import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScenariosClient } from "~/components/scenarios/ScenariosClient";

export const metadata = {
  title: "Scenarios | adsync",
};

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-medium tracking-tight">Scenarios</h1>
          <p className="text-base text-muted-foreground">
            Build and manage custom automation flows for Facebook Ads to Google
            Sheets.
          </p>
        </div>
        <Button
          render={<Link href="/scenarios/new" />}
          className="shrink-0"
        >
          <Plus className="size-4" aria-hidden />
          New scenario
        </Button>
      </div>

      {/* Scenarios list */}
      <ScenariosClient />
    </div>
  );
}
