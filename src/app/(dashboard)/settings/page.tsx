"use client";

import * as React from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { ProfileSection } from "~/components/settings/ProfileSection";
import { ThemeSection } from "~/components/settings/ThemeSection";
import { TimezoneSection } from "~/components/settings/TimezoneSection";
import { DangerZone } from "~/components/settings/DangerZone";

/* ------------------------------------------------------------------ */
/* Loading skeleton — matches real section dimensions                   */
/* ------------------------------------------------------------------ */

function SectionCardSkeleton({
  titleWidth,
  descWidth,
  children,
}: {
  titleWidth: string;
  descWidth: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={`h-5 ${titleWidth}`} />
        <Skeleton className={`h-4 ${descWidth}`} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      {/* Profile */}
      <SectionCardSkeleton titleWidth="w-16" descWidth="w-64">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-44" />
          </div>
        </div>
      </SectionCardSkeleton>

      {/* Theme */}
      <SectionCardSkeleton titleWidth="w-28" descWidth="w-40">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </SectionCardSkeleton>

      {/* Timezone */}
      <SectionCardSkeleton titleWidth="w-24" descWidth="w-56">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-4 w-48" />
        </div>
      </SectionCardSkeleton>

      {/* Danger zone */}
      <Skeleton className="h-[120px] rounded-xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error state                                                          */
/* ------------------------------------------------------------------ */

function SettingsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-xl border border-border py-16 text-center"
    >
      <AlertCircle className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">Failed to load settings</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry} className="gap-1.5">
        <RefreshCcw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                            */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { data: user, isLoading, isError, refetch } = api.settings.get.useQuery();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, appearance, and account data.
        </p>
      </div>

      {isLoading && <SettingsSkeleton />}

      {isError && !isLoading && (
        <SettingsError onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && user && (
        <div className="space-y-6">
          <ProfileSection user={user} />
          <ThemeSection />
          <TimezoneSection initialTimezone={user.timezone} />
          {/* DangerZone is at the bottom, visually separated */}
          <div className="pt-4">
            <DangerZone />
          </div>
        </div>
      )}
    </div>
  );
}
