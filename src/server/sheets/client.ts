import "server-only";
import { google } from "googleapis";

export type SheetRow = string[];

let _auth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (_auth) return _auth;
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyB64) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");
  const keyJson = Buffer.from(keyB64, "base64").toString("utf8");
  const credentials = JSON.parse(keyJson) as {
    client_email: string;
    private_key: string;
    [key: string]: unknown;
  };
  _auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return _auth;
}

/**
 * Fetch all values from a spreadsheet range.
 * Returns rows as string arrays; empty cells become empty strings.
 *
 * @param sheetId - The spreadsheet ID
 * @param range - A1 notation range (e.g. "Leads" or "Leads!A1:Z1000")
 * @returns A 2D array of stringified cell values
 */
export async function getRows(sheetId: string, range: string): Promise<SheetRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const values = response.data.values ?? [];
  return values.map((row) => row.map((cell) => String(cell ?? "")));
}
