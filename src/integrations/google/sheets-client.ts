/**
 * Stub — real implementation provided by Agent B on branch phase2/sheets-client.
 * This file exists only so that module-handlers.ts can import and tests can vi.mock it.
 * DO NOT add logic here — Agent B owns this file in their branch.
 */

export async function appendRows(
  _userId: string,
  _spreadsheetId: string,
  _tabName: string,
  _rows: unknown[],
): Promise<void> {
  throw new Error("sheets-client stub: not implemented — Agent B provides real implementation");
}

export async function upsertRows(
  _userId: string,
  _spreadsheetId: string,
  _tabName: string,
  _keyFields: string[],
  _rows: unknown[],
): Promise<void> {
  throw new Error("sheets-client stub: not implemented — Agent B provides real implementation");
}
