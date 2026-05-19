import type { Scenario, ScenarioStep } from "~/server/mocks/types";

export type TemplateScenario = Omit<
  Scenario,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export type ScenarioTemplate = {
  id: string;
  name: string;
  description: string;
  factory: () => TemplateScenario;
};

function step(
  position: number,
  moduleType: ScenarioStep["moduleType"],
  config: Record<string, unknown>,
): Omit<ScenarioStep, "id" | "scenarioId"> {
  return { position, moduleType, config };
}

/**
 * Strip ids from a template's steps; the builder fills them in once the
 * scenario gets a real id (either from `create` or a temporary client id).
 */
function asSteps(
  partials: Omit<ScenarioStep, "id" | "scenarioId">[],
): ScenarioStep[] {
  return partials.map((p) => ({
    ...p,
    id: `template_step_${p.position}`,
    scenarioId: "template",
  }));
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "tmpl_daily_campaign",
    name: "Daily campaign metrics → Sheet",
    description:
      "Pull yesterday's campaign-level metrics every morning and upsert into a Sheets tab.",
    factory: (): TemplateScenario => ({
      name: "Daily campaign metrics → Sheet",
      kind: "CUSTOM",
      enabled: false,
      steps: asSteps([
        step(1, "trigger.schedule", {
          cronExpression: "0 6 * * *",
          timezone: "Asia/Tashkent",
        }),
        step(2, "fb.campaign_insights", {
          fbAccountId: "",
          dateWindowDays: 1,
          metrics: ["impressions", "clicks", "spend", "ctr", "cpm"],
        }),
        step(3, "sheets.upsert", {
          spreadsheetId: "",
          tabName: "DailyCampaigns",
          keyFields: ["date", "campaign_id"],
          mappedFields: { impressions: "", clicks: "", spend: "", ctr: "", cpm: "" },
        }),
      ]),
      lastRunAt: null,
      lastRunStatus: null,
    }),
  },
  {
    id: "tmpl_hourly_ads",
    name: "Hourly ad performance refresh",
    description:
      "Refresh ad-level metrics every 6 hours and upsert into Sheets for live monitoring.",
    factory: (): TemplateScenario => ({
      name: "Hourly ad performance refresh",
      kind: "CUSTOM",
      enabled: false,
      steps: asSteps([
        step(1, "trigger.schedule", {
          cronExpression: "0 */6 * * *",
          timezone: "Asia/Tashkent",
        }),
        step(2, "fb.ad_insights", {
          fbAccountId: "",
          dateWindowDays: 1,
          metrics: ["impressions", "clicks", "spend", "ctr"],
        }),
        step(3, "sheets.upsert", {
          spreadsheetId: "",
          tabName: "AdPerformance",
          keyFields: ["date", "ad_id"],
          mappedFields: { impressions: "", clicks: "", spend: "", ctr: "" },
        }),
      ]),
      lastRunAt: null,
      lastRunStatus: null,
    }),
  },
  {
    id: "tmpl_manual_pull",
    name: "One-shot manual pull",
    description:
      "On-demand campaign snapshot — useful for spot-checks or ad-hoc reporting.",
    factory: (): TemplateScenario => ({
      name: "One-shot manual pull",
      kind: "CUSTOM",
      enabled: false,
      steps: asSteps([
        step(1, "trigger.manual", {}),
        step(2, "fb.campaign_insights", {
          fbAccountId: "",
          dateWindowDays: 7,
          metrics: ["impressions", "clicks", "spend", "ctr"],
        }),
        step(3, "sheets.append", {
          spreadsheetId: "",
          tabName: "ManualPulls",
          mappedFields: { impressions: "", clicks: "", spend: "", ctr: "" },
        }),
      ]),
      lastRunAt: null,
      lastRunStatus: null,
    }),
  },
];

export function getTemplate(id: string): ScenarioTemplate | undefined {
  return SCENARIO_TEMPLATES.find((t) => t.id === id);
}
