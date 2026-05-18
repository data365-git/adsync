import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";

export type UpstreamCatalogField = {
  key: string;
  sampleValue: string | null;
};

export type UpstreamCatalogStep = {
  stepId: string;
  moduleType: ModuleType;
  label: string;
  fields: UpstreamCatalogField[];
};

type CatalogStepInput = {
  id: string;
  position: number;
  moduleType: ModuleType;
};

export type SheetSample = {
  columns: string[];
  rows: Array<Record<string, string>>;
};

function valueToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value.toString();
  return JSON.stringify(value);
}

function isSheetReadModule(moduleType: ModuleType): boolean {
  return (
    moduleType === "trigger.watch.sheets_new_rows" ||
    moduleType === "sheets.find_rows" ||
    moduleType === "sheets.get_row"
  );
}

export function buildUpstreamCatalog(
  steps: CatalogStepInput[],
  currentPosition: number,
  sheetSample?: SheetSample,
): UpstreamCatalogStep[] {
  return steps
    .filter((step) => step.position < currentPosition)
    .map((step) => {
      const moduleDefinition = getModule(step.moduleType);
      const sampleRow = moduleDefinition?.sampleOutput[0] ?? {};
      const fields =
        isSheetReadModule(step.moduleType) && sheetSample
          ? sheetSample.columns.map((key) => ({
              key,
              sampleValue: sheetSample.rows[0]?.[key] ?? null,
            }))
          : Object.entries(sampleRow).map(([key, value]) => ({
              key,
              sampleValue: valueToString(value),
            }));

      return {
        stepId: step.id,
        moduleType: step.moduleType,
        label: moduleDefinition?.name ?? step.moduleType,
        fields,
      };
    })
    .filter((step) => step.fields.length > 0);
}
