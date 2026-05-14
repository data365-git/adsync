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

export type RowIdentifier =
  | { kind: "row"; row: number }
  | { kind: "key"; column: string; value: string };

/**
 * Parses a user-supplied row identifier string.
 *   "3"            -> { kind: "row", row: 3 }
 *   "id=42"        -> { kind: "key", column: "id", value: "42" }
 * Throws if the input doesn't match either form.
 */
export function parseRowIdentifier(input: string): RowIdentifier {
  const trimmed = input.trim();
  if (trimmed === "") {
    throw new Error(`Invalid rowIdentifier: empty`);
  }
  if (/^-?\d+$/.test(trimmed)) {
    const row = Number.parseInt(trimmed, 10);
    if (row < 1) {
      throw new Error(`Invalid rowIdentifier: row must be >= 1, got ${row}`);
    }
    return { kind: "row", row };
  }
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) {
    throw new Error(
      `Invalid rowIdentifier: "${input}" — expected a row number or "column=value"`,
    );
  }
  const column = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (column === "" || value === "") {
    throw new Error(
      `Invalid rowIdentifier: "${input}" — column and value must both be non-empty`,
    );
  }
  return { kind: "key", column, value };
}

/**
 * Update exactly one row in a sheet tab. The target is identified by `rowIdentifier`
 * (see parseRowIdentifier). Only the columns present in `mappedRow` are written —
 * other columns of the row are not touched. Unknown headers in `mappedRow` are
 * silently skipped (matches append/upsert tolerance).
 *
 * Returns the 1-indexed sheet row number of the updated row plus the list of
 * column headers that were written.
 */
export async function updateRow(
  userId: string,
  spreadsheetId: string,
  tabName: string,
  rowIdentifier: string,
  mappedRow: Record<string, unknown>,
): Promise<{ row: number; updatedFields: string[] }> {
  const ident = parseRowIdentifier(rowIdentifier);
  const client = await getAuthedClient(userId);
  const sheets = google.sheets({ version: "v4", auth: client });

  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabName,
  });
  const values = (readRes.data.values ?? []) as string[][];
  if (values.length === 0) {
    throw new Error(`Sheet tab "${tabName}" is empty — cannot update`);
  }
  // values.length > 0 guaranteed above
  const headers = values[0]!;

  let targetRow: number;
  if (ident.kind === "row") {
    targetRow = ident.row;
  } else {
    const colIdx = headers.indexOf(ident.column);
    if (colIdx === -1) {
      throw new Error(
        `Column "${ident.column}" not found in tab "${tabName}"`,
      );
    }
    const dataRows = values.slice(1);
    const foundIdx = dataRows.findIndex((r) => (r[colIdx] ?? "") === ident.value);
    if (foundIdx === -1) {
      throw new Error(
        `No row found where ${ident.column} = "${ident.value}" in tab "${tabName}"`,
      );
    }
    targetRow = foundIdx + 2; // header is row 1
  }

  // Build a sparse update: only write columns whose header is in mappedRow.
  const updatedFields: string[] = [];
  const requestData: Array<{ range: string; values: string[][] }> = [];
  for (const [header, value] of Object.entries(mappedRow)) {
    const colIdx = headers.indexOf(header);
    if (colIdx === -1) {
      // Skip unknown headers — matches append/upsert tolerance.
      continue;
    }
    const colLetter = columnLetter(colIdx);
    const cellValue = unknownToCell(value);
    requestData.push({
      range: `${tabName}!${colLetter}${targetRow}`,
      values: [[cellValue]],
    });
    updatedFields.push(header);
  }

  if (requestData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: requestData,
      },
    });
  }

  return { row: targetRow, updatedFields };
}

/** Convert an unknown cell value to a string safe for Sheets API. */
function unknownToCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v);
  }
  return JSON.stringify(v);
}

/**
 * Convert a 0-indexed column number to the A1 letter (0 -> "A", 25 -> "Z", 26 -> "AA").
 */
function columnLetter(idx: number): string {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
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
