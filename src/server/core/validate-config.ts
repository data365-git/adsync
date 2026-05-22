const REQUIRED_FIELDS: Record<string, string[]> = {
  "trigger.schedule": ["cronExpression", "timezone"],
  "trigger.watch.sheets_new_rows": ["spreadsheetId", "tabName", "watchColumn"],
  "fb.account_insights": ["fbAccountId", "metrics"],
  "fb.campaign_insights": ["fbAccountId", "metrics"],
  "fb.ad_insights": ["fbAccountId", "metrics"],
  "sheets.append": ["spreadsheetId", "tabName", "mappedFields"],
  "sheets.upsert": ["spreadsheetId", "tabName", "keyFields", "mappedFields"],
  "sheets.find_rows": ["spreadsheetId", "tabName"],
  "sheets.update_row": ["spreadsheetId", "tabName", "rowIdentifier", "mappedFields"],
  "bitrix.create_lead": ["title", "name", "sourceId"],
  "bitrix.update_lead": ["leadId"],
};

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
