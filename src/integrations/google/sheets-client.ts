import { google } from "googleapis";
import { getAuthedClient } from "./oauth";

/**
 * Appends rows to a tab. Creates the tab if it doesn't exist.
 * Returns the number of rows appended.
 */
export async function appendRows(
  userId: string,
  spreadsheetId: string,
  tabName: string,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const auth = await getAuthedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  await ensureTabExists(sheets, spreadsheetId, tabName);

  const headers = Object.keys(rows[0]!);
  const values = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return rows.length;
}

/**
 * Upserts rows into a tab keyed on keyFields.
 * Reads existing rows, merges by key, writes back.
 * Creates the tab if it doesn't exist.
 * Returns the number of rows written (created + updated).
 */
export async function upsertRows(
  userId: string,
  spreadsheetId: string,
  tabName: string,
  keyFields: string[],
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const auth = await getAuthedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  await ensureTabExists(sheets, spreadsheetId, tabName);

  const headers = Object.keys(rows[0]!);
  const existing = await readTab(sheets, spreadsheetId, tabName);

  // Build a map from composite key → merged row
  const keyOf = (row: Record<string, unknown>) =>
    keyFields
      .map((k) => {
        const v = row[k];
        if (v === null || v === undefined) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
          return String(v);
        }
        // object / symbol / function — JSON-serialise to avoid '[object Object]'
        return JSON.stringify(v);
      })
      .join("|");

  const existingMap = new Map<string, Record<string, unknown>>();
  for (const row of existing) existingMap.set(keyOf(row), row);

  for (const row of rows) {
    existingMap.set(keyOf(row), { ...existingMap.get(keyOf(row)), ...row });
  }

  const merged = Array.from(existingMap.values());
  const allHeaders = Array.from(
    new Set([...headers, ...Object.keys(merged[0] ?? {})]),
  );
  const values = [
    allHeaders,
    ...merged.map((r) => allHeaders.map((h) => r[h] ?? "")),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return merged.length;
}

async function ensureTabExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === tabName,
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  }
}

async function readTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
): Promise<Record<string, unknown>[]> {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A1:ZZZ`,
  });
  const rows = resp.data.values ?? [];
  if (rows.length < 2) return [];
  const [headers, ...data] = rows as string[][];
  return data.map((row) =>
    Object.fromEntries((headers ?? []).map((h, i) => [h, row[i] ?? ""])),
  );
}
