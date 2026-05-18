/**
 * End-to-end QA probe for the canonical Sheets→Bitrix scenario.
 * Exercises real Drive/Sheets/Bitrix calls + the pure helpers (interpolate,
 * buildRowFromMapping) without going through tRPC's auth wall.
 *
 * Run with: pnpm tsx --conditions react-server scripts/qa-canonical.ts
 * Delete before commit.
 */

import { db } from "~/server/db";
import { Provider } from "@prisma/client";
import { google } from "googleapis";
import { getAuthedClient } from "~/integrations/google/oauth";
import { call as bitrixCall } from "~/server/bitrix24/client";
import { readTabRows } from "~/integrations/google/sheets-client";
import { interpolate, pickTokens } from "~/server/core/template";
import { buildRowFromMapping } from "~/server/core/module-handlers";

const CANONICAL = {
  spreadsheetName: "Test",
  tabName: "Sheet1",
  watchColumn: "id",
  bitrixMapping: {
    title: "Lead from {{name}}",
    name: "{{name}}",
    email: "{{email}}",
    phone: "",
    sourceId: "OTHER",
    comments: "Auto created — id={{id}}",
  },
};

type CheckResult = { name: string; pass: boolean; detail: string };
const results: CheckResult[] = [];

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  const tag = pass ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name} — ${detail}`);
}

async function main() {
  const allowed = (process.env.ALLOWLIST_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const user = await db.user.findFirst({ where: { email: { in: allowed } } });
  if (!user) {
    console.error("FATAL: no user matching ALLOWLIST_EMAIL");
    process.exit(1);
  }
  console.log(`User: ${user.email} (${user.id})\n`);

  // F1/F2: connections exist
  console.log("=== F2: OAuth connection rows ===");
  const google_conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId: user.id, provider: Provider.GOOGLE_SHEETS } },
  });
  record(
    "F2.google_connected",
    google_conn?.status === "CONNECTED",
    `status=${google_conn?.status ?? "missing"} email=${google_conn?.email ?? "?"}`,
  );
  const bitrix_conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId: user.id, provider: Provider.BITRIX24 } },
  });
  record(
    "F2.bitrix_connected",
    bitrix_conn?.status === "CONNECTED",
    `status=${bitrix_conn?.status ?? "missing"}`,
  );

  // F4/F6: list spreadsheets
  console.log("\n=== F6: listSpreadsheets ===");
  let spreadsheetId = "";
  try {
    const auth = await getAuthedClient(user.id);
    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id,name)",
      pageSize: 50,
    });
    const files = res.data.files ?? [];
    const test = files.find((f) => f.name === CANONICAL.spreadsheetName);
    spreadsheetId = test?.id ?? "";
    record(
      "F6.drive_lists",
      files.length > 0,
      `found ${files.length} spreadsheets`,
    );
    record(
      "F6.test_sheet_present",
      Boolean(spreadsheetId),
      spreadsheetId ? `id=${spreadsheetId}` : "MISSING — canonical 'Test' sheet not found",
    );
  } catch (e) {
    record("F6.drive_lists", false, `EXC: ${(e as Error).message}`);
  }

  // F7/F8/F9: list tabs, columns, sample
  if (spreadsheetId) {
    console.log("\n=== F7: listSheetTabs ===");
    try {
      const auth = await getAuthedClient(user.id);
      const sheets = google.sheets({ version: "v4", auth });
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets(properties(title,sheetId,index))",
      });
      const tabs = meta.data.sheets ?? [];
      const hasSheet1 = tabs.some((t) => t.properties?.title === CANONICAL.tabName);
      record("F7.tabs_listed", tabs.length > 0, `${tabs.length} tabs`);
      record("F7.tab_present", hasSheet1, `Sheet1 ${hasSheet1 ? "found" : "MISSING"}`);

      console.log("\n=== F8: listSheetColumns ===");
      const colRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${CANONICAL.tabName}!A1:ZZ1`,
      });
      const cols = (colRes.data.values?.[0] ?? []).map((c) => String(c).trim()).filter(Boolean);
      record("F8.columns_listed", cols.length > 0, `[${cols.join(", ")}]`);

      console.log("\n=== F9: listSheetSample (row 2) ===");
      const sampleRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${CANONICAL.tabName}!A1:ZZ3`,
      });
      const values = sampleRes.data.values ?? [];
      const header = values[0] ?? [];
      const dataRow = values[1] ?? [];
      const sample: Record<string, string> = {};
      header.forEach((h, i) => {
        sample[String(h).trim()] = String(dataRow[i] ?? "");
      });
      record(
        "F9.sample_has_values",
        Object.values(sample).some((v) => v.length > 0),
        `row1 = ${JSON.stringify(sample)}`,
      );
    } catch (e) {
      record("F7-9.exc", false, `EXC: ${(e as Error).message}`);
    }
  }

  // F: trigger handler equivalent — readTabRows
  if (spreadsheetId) {
    console.log("\n=== F: trigger.watch.sheets_new_rows readTabRows ===");
    try {
      const rows = await readTabRows(user.id, spreadsheetId, CANONICAL.tabName);
      record(
        "F.readTabRows_returns",
        Array.isArray(rows),
        `${rows.length} rows; first = ${JSON.stringify(rows[0] ?? null)}`,
      );
    } catch (e) {
      record("F.readTabRows", false, `EXC: ${(e as Error).message}`);
    }
  }

  // F5: bitrix pipelines
  console.log("\n=== F5: bitrixPipelines (crm.dealcategory.list) ===");
  try {
    const cats = await bitrixCall<Array<{ ID: string; NAME: string }>>("crm.dealcategory.list", {});
    record(
      "F5.bitrix_crm_ok",
      Array.isArray(cats),
      `${cats?.length ?? 0} deal categories`,
    );
  } catch (e) {
    record("F5.bitrix_crm_ok", false, `EXC: ${(e as Error).message}`);
  }

  // F14: interpolate edge cases
  console.log("\n=== F14: interpolate edge cases ===");
  const u = { name: "Alice", email: "a@x.com", id: 7 };
  record(
    "F14.basic",
    interpolate("Hello {{name}}", u) === "Hello Alice",
    `out="${interpolate("Hello {{name}}", u)}"`,
  );
  record(
    "F14.whitespace",
    interpolate("Hello {{ name }}", u) === "Hello Alice",
    `whitespace tolerated`,
  );
  record(
    "F14.missing",
    interpolate("X={{missing}}!", u) === "X=!",
    `missing→empty: out="${interpolate("X={{missing}}!", u)}"`,
  );
  record(
    "F14.number",
    interpolate("id={{id}}", u) === "id=7",
    `number→string`,
  );
  record(
    "F14.multiple",
    interpolate("{{name}} <{{email}}>", u) === "Alice <a@x.com>",
    `multi-token`,
  );
  record(
    "F14.repeat",
    interpolate("{{name}}-{{name}}", u) === "Alice-Alice",
    `repeated token`,
  );
  record(
    "F14.pickTokens",
    JSON.stringify(pickTokens("a {{x}} b {{y}}")) === '["x","y"]',
    `pickTokens unique`,
  );

  // F: buildRowFromMapping
  console.log("\n=== F: buildRowFromMapping with canonical bitrix mapping ===");
  const upstream = { id: 7, name: "Alice", email: "alice@x.com", status: "new" };
  const built = buildRowFromMapping(upstream, CANONICAL.bitrixMapping);
  record(
    "F.built.title",
    built.title === "Lead from Alice",
    `title="${built.title}"`,
  );
  record(
    "F.built.email",
    built.email === "alice@x.com",
    `email="${built.email}"`,
  );
  record(
    "F.built.literal",
    built.sourceId === "OTHER",
    `sourceId literal preserved`,
  );
  record(
    "F.built.empty",
    built.phone === "",
    `empty expr → "" (interpolated)`,
  );
  record(
    "F.built.composite",
    built.comments === "Auto created — id=7",
    `comments="${built.comments}"`,
  );

  // F13: legacy array shape — coerced via buildRowFromMapping?
  // Skip: buildRowFromMapping requires Record; coercion lives inside handlers.
  // Verify in unit tests instead.

  // F19: module catalog parity (each catalog type has a registered handler)
  console.log("\n=== F19: module catalog ↔ handler parity ===");
  const { MODULES } = await import("~/lib/modules");
  const { getHandler } = await import("~/server/core/module-handlers");
  const missing: string[] = [];
  for (const m of MODULES) {
    try {
      getHandler(m.id);
    } catch {
      missing.push(m.id);
    }
  }
  record(
    "F19.no_missing_handlers",
    missing.length === 0,
    missing.length ? `MISSING: ${missing.join(", ")}` : `all ${MODULES.length} catalog types have handlers`,
  );

  // Summary
  console.log("\n══════ SUMMARY ══════");
  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  console.log(`PASS: ${pass}   FAIL: ${fail}   TOTAL: ${results.length}`);
  if (fail > 0) {
    console.log("\n  FAILURES:");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`    🔴 ${r.name} — ${r.detail}`);
    }
  }

  await db.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
