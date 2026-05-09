"use client";

import * as React from "react";
import { SCENARIO_TEMPLATES } from "~/lib/scenario-templates";
import { TemplatePicker } from "~/components/scenarios/builder/TemplatePicker";
import { ScenarioBuilder, type DraftStep } from "~/components/scenarios/builder/ScenarioBuilder";

interface NewScenarioClientProps {
  /** undefined = show template picker. String = build with that template or empty if "scratch" */
  templateId?: string;
}

export function NewScenarioClient({ templateId }: NewScenarioClientProps) {
  // No templateId = show the picker
  if (!templateId) {
    return <TemplatePicker />;
  }

  // "scratch" or unrecognized id = empty builder
  const template = SCENARIO_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    // From-scratch builder: one empty trigger step
    return (
      <ScenarioBuilder
        initialName="Untitled scenario"
        initialSteps={[
          {
            id: "draft_trigger_1",
            position: 1,
            moduleType: "trigger.manual" as const,
            config: {},
          } satisfies DraftStep,
        ]}
      />
    );
  }

  // Template builder
  const partial = template.factory();
  const initialSteps: DraftStep[] = partial.steps.map((s) => ({
    id: s.id,
    position: s.position,
    moduleType: s.moduleType,
    config: s.config,
  }));

  return (
    <ScenarioBuilder
      initialName={partial.name}
      initialSteps={initialSteps}
    />
  );
}
