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

/**
 * Find rows in a sheet tab where the value in `searchColumn` matches `searchValue`.
 * Returns row-objects shaped { row, ...namedFields } where `row` is the 1-indexed
 * sheet row number and each named field comes from the header row.
 *
 * Reads the entire tab. For sheets > ~5,000 rows this gets slow — defer to v2.
 */
export async function findRows(
  userId: string,
  spreadsheetId: string,
  tabName: string,
  searchColumn: string,
  searchValue: string,
): Promise<Array<Record<string, unknown>>> {
  const client = await getAuthedClient(userId);
  const sheets = google.sheets({ version: "v4", auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabName,
  });

  const values = (res.data.values ?? []) as string[][];
  if (values.length === 0) {
    return [];
  }

  // values.length === 0 is guarded above, so values[0] is always defined here
  const headers = values[0]!;
  const dataRows = values.slice(1);
  const colIndex = headers.indexOf(searchColumn);
  if (colIndex === -1) {
    throw new Error(
      `Column "${searchColumn}" not found in tab "${tabName}" of spreadsheet ${spreadsheetId}`,
    );
  }

  const matches: Array<Record<string, unknown>> = [];
  dataRows.forEach((row, idx) => {
    if ((row[colIndex] ?? "") === searchValue) {
      const obj: Record<string, unknown> = { row: idx + 2 };
      headers.forEach((header, hIdx) => {
        obj[header] = row[hIdx] ?? "";
      });
      matches.push(obj);
    }
  });
  return matches;
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
