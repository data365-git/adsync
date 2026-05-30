const REQUIRED_FIELDS: Record<string, string[]> = {
  "trigger.schedule": ["cronExpression", "timezone"],
  "trigger.watch.sheets_new_rows": ["spreadsheetId", "tabName", "watchColumn"],
  "sheets.append": ["spreadsheetId", "tabName", "mappedFields"],
  "sheets.upsert": ["spreadsheetId", "tabName", "keyFields", "mappedFields"],
  "sheets.find_rows": ["spreadsheetId", "tabName"],
  "sheets.update_row": ["spreadsheetId", "tabName", "rowIdentifier", "mappedFields"],
  "bitrix.create_lead": ["portalId", "title", "name", "sourceId"],
  "bitrix.update_lead": ["portalId", "leadId"],
  "bitrix.delete_lead": ["portalId", "leadId"],
  "bitrix.create_deal": ["portalId", "title", "categoryId", "stageId"],
};

/** Human-friendly labels for the fields we validate — used in error messages. */
const FIELD_LABELS: Record<string, string> = {
  cronExpression: "schedule",
  timezone: "timezone",
  spreadsheetId: "spreadsheet",
  tabName: "tab",
  watchColumn: "watch column",
  searchColumn: "search column",
  keyFields: "key field",
  mappedFields: "field mapping",
  rowIdentifier: "row identifier",
  portalId: "Bitrix24 portal",
  title: "lead title",
  name: "first name",
  sourceId: "source",
  leadId: "lead ID",
  categoryId: "pipeline",
  stageId: "stage",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export function validateStepConfig(
  moduleType: string,
  config: unknown,
): { ok: true } | { ok: false; field: string } {
  const required = REQUIRED_FIELDS[moduleType] ?? [];
  const record =
    typeof config === "object" && config !== null
      ? (config as Record<string, unknown>)
      : {};

  for (const field of required) {
    if (isMissing(record[field])) {
      return { ok: false, field };
    }
  }

  return { ok: true };
}

/**
 * Validate every step in a scenario. Returns the first incomplete step
 * (1-based position + the missing field), or null when all steps are valid.
 * Used as the gate for running / enabling a scenario — the executor itself
 * enforces the same REQUIRED_FIELDS at run time.
 */
export function findFirstInvalidStep(
  steps: Array<{ position: number; moduleType: string; config: unknown }>,
): { position: number; moduleType: string; field: string } | null {
  for (const step of steps) {
    const result = validateStepConfig(step.moduleType, step.config);
    if (!result.ok) {
      return {
        position: step.position,
        moduleType: step.moduleType,
        field: result.field,
      };
    }
  }
  return null;
}
