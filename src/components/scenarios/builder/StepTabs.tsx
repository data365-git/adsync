"use client";

import * as React from "react";
import { useQueryState } from "nuqs";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "~/components/ui/tabs";
import { RunsTab } from "./RunsTab";
import { SettingsTab } from "./SettingsTab";
import type { Run, Scenario } from "~/server/mocks/types";

interface StepTabsProps {
  scenario: Scenario;
  runs: Run[];
  /** The builder content rendered in the "builder" tab */
  builderContent: React.ReactNode;
  /** Called when scenario name is changed from Settings tab */
  onNameChange: (name: string) => void;
}

export function StepTabs({
  scenario,
  runs,
  builderContent,
  onNameChange,
}: StepTabsProps) {
  const [tab, setTab] = useQueryState("tab", { defaultValue: "builder" });

  return (
    <Tabs
      value={tab}
      onValueChange={(val) => {
        if (val !== null) {
          const result = setTab(val as string);
          if (result instanceof Promise) void result;
        }
      }}
      className="flex-1"
    >
      <div className="border-b border-border px-4">
        <TabsList variant="line" className="h-10">
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="builder" className="mt-0">
        {builderContent}
      </TabsContent>

      <TabsContent value="runs" className="mt-0 px-4 py-6">
        <RunsTab runs={runs} scenarioId={scenario.id} />
      </TabsContent>

      <TabsContent value="settings" className="mt-0 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <SettingsTab
            scenarioId={scenario.id}
            currentName={scenario.name}
            onNameChange={onNameChange}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
