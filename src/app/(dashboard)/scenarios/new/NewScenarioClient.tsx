"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { TemplatePicker } from "~/components/scenarios/TemplatePicker";
import {
  ScenarioBuilder,
  type DraftStep,
} from "~/components/scenarios/builder/ScenarioBuilder";
import { api } from "~/trpc/react";

export function NewScenarioClient() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");
  const [chosen, setChosen] = React.useState<{
    name: string;
    steps: DraftStep[];
  } | null>(null);
  const templatesQ = api.modules.listTemplates.useQuery();
  const utils = api.useUtils();

  async function pickTemplate(templateId: string) {
    try {
      const tpl = await utils.modules.getTemplate.fetch({ templateId });
      const steps: DraftStep[] = tpl.steps.map((s, idx) => ({
        id: `draft_template_${templateId}_${idx}`,
        position: s.position,
        moduleType: s.moduleType,
        config: s.config,
      }));
      setChosen({ name: tpl.name, steps });
    } catch (err) {
      toast.error(
        `Couldn't load template: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
    }
  }

  function startScratch() {
    setChosen({ name: "", steps: [] });
  }

  if (chosen === null) {
    return (
      <TemplatePicker
        templates={(templatesQ.data ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
        }))}
        isLoading={templatesQ.isPending}
        onPickTemplate={(templateId) => void pickTemplate(templateId)}
        onStartScratch={startScratch}
      />
    );
  }

  return (
    <ScenarioBuilder
      initialName={chosen.name}
      initialSteps={chosen.steps}
      initialFolderId={folderId}
    />
  );
}
