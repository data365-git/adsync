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
    id: "tmpl_sheets_to_bitrix",
    name: "New Sheets row → Bitrix24 lead",
    description:
      "Watch a Google Sheets tab for new rows and create a Bitrix24 lead for each.",
    factory: (): TemplateScenario => ({
      name: "New Sheets row → Bitrix24 lead",
      kind: "CUSTOM",
      enabled: false,
      steps: asSteps([
        step(1, "trigger.watch.sheets_new_rows", {
          spreadsheetId: "",
          tabName: "",
          watchColumn: "",
        }),
        step(2, "bitrix.create_lead", {
          title: "Lead from Sheets",
          name: "",
          lastName: "",
          phone: "",
          email: "",
          sourceId: "WEB",
          comments: "",
        }),
      ]),
      lastRunAt: null,
      lastRunStatus: null,
    }),
  },
  {
    id: "tmpl_scheduled_sheets_append",
    name: "Daily scheduled Sheets append",
    description:
      "Run on a daily schedule and append rows to a Google Sheets tab.",
    factory: (): TemplateScenario => ({
      name: "Daily scheduled Sheets append",
      kind: "CUSTOM",
      enabled: false,
      steps: asSteps([
        step(1, "trigger.schedule", {
          cronExpression: "0 6 * * *",
          timezone: "Asia/Tashkent",
        }),
        step(2, "sheets.find_rows", {
          spreadsheetId: "",
          tabName: "",
          searchColumn: "",
          searchValue: "",
        }),
        step(3, "bitrix.create_lead", {
          title: "",
          name: "",
          sourceId: "WEB",
          comments: "",
        }),
      ]),
      lastRunAt: null,
      lastRunStatus: null,
    }),
  },
  {
    id: "tmpl_manual_sheets_upsert",
    name: "Manual Sheets upsert",
    description: "On-demand upsert into a Google Sheets tab.",
    factory: (): TemplateScenario => ({
      name: "Manual Sheets upsert",
      kind: "CUSTOM",
      enabled: false,
      steps: asSteps([
        step(1, "trigger.manual", {}),
        step(2, "sheets.find_rows", {
          spreadsheetId: "",
          tabName: "",
          searchColumn: "",
          searchValue: "",
        }),
        step(3, "sheets.upsert", {
          spreadsheetId: "",
          tabName: "",
          keyFields: [],
          mappedFields: {},
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
