/**
 * One-off verification script for the new /connections resource queries.
 * Bypasses the tRPC auth layer by calling the underlying clients directly
 * with the real user ID. Run with: pnpm tsx scripts/verify-resources.ts
 */

import { db } from "~/server/db";
import { Provider } from "@prisma/client";
import { google } from "googleapis";
import { getAuthedClient } from "~/integrations/google/oauth";
import { listAdAccounts } from "~/integrations/facebook/graph-client";
import { getFbAccessToken } from "~/integrations/facebook/oauth";
import { call as bitrixCall } from "~/server/bitrix24/client";

async function main() {
  const allowed = (process.env.ALLOWLIST_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    console.error("ALLOWLIST_EMAIL not set");
    process.exit(1);
  }

  const user = await db.user.findFirst({
    where: { email: { in: allowed } },
  });

  if (!user) {
    console.error(`No user found for emails: ${allowed.join(", ")}`);
    process.exit(1);
  }

  console.log(`User: ${user.email} (${user.id})\n`);

  // ── Google Drive (listSpreadsheets) ──────────────────────────────────────
  console.log("--- Google Sheets / Drive ---");
  try {
    const conn = await db.oAuthConnection.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: Provider.GOOGLE_SHEETS },
      },
    });

    if (!conn || conn.status !== "CONNECTED") {
      console.log(`  status: ${conn?.status ?? "no row"} — skipping Drive call`);
    } else {
      const auth = await getAuthedClient(user.id);
      const drive = google.drive({ version: "v3", auth });
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: "files(id,name)",
        pageSize: 5,
      });
      const files = res.data.files ?? [];
      console.log(`  ✓ Drive API OK — ${files.length} spreadsheets visible:`);
      files.slice(0, 5).forEach((f) => console.log(`    - ${f.name} (${f.id})`));

      if (files.length > 0 && files[0]?.id) {
        const sheets = google.sheets({ version: "v4", auth });
        const meta = await sheets.spreadsheets.get({
          spreadsheetId: files[0].id,
          fields: "sheets(properties(title,sheetId))",
        });
        const tabs = meta.data.sheets ?? [];
        console.log(`  ✓ Sheets API OK — ${tabs.length} tabs in "${files[0].name}":`);
        tabs.slice(0, 5).forEach((t) =>
          console.log(`    - ${t.properties?.title} (sheetId=${t.properties?.sheetId})`),
        );

        const firstTab = tabs[0]?.properties?.title;
        if (firstTab) {
          const values = await sheets.spreadsheets.values.get({
            spreadsheetId: files[0].id,
            range: `${firstTab}!A1:ZZ1`,
          });
          const cols = (values.data.values?.[0] ?? []).filter((c) => String(c).trim());
          console.log(`  ✓ Columns in "${firstTab}": ${cols.length === 0 ? "(empty header row)" : cols.join(", ")}`);
        }
      }
    }
  } catch (err) {
    console.log(`  ✗ FAILED: ${(err as Error).message}`);
  }

  // ── Bitrix24 (bitrixPipelines) ───────────────────────────────────────────
  console.log("\n--- Bitrix24 ---");
  try {
    const result = await bitrixCall("crm.dealcategory.list", {});
    const list = Array.isArray(result) ? result : [];
    console.log(`  ✓ CRM API OK — ${list.length} deal categories`);
    list.slice(0, 5).forEach((c: { ID?: string; NAME?: string }) =>
      console.log(`    - ${c.NAME} (id=${c.ID})`),
    );
  } catch (err) {
    console.log(`  ✗ FAILED: ${(err as Error).message}`);
  }

  // ── Facebook (facebookAdAccounts) ────────────────────────────────────────
  console.log("\n--- Facebook ---");
  try {
    const conn = await db.oAuthConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider: Provider.FACEBOOK } },
    });

    if (!conn || conn.status !== "CONNECTED") {
      console.log(`  status: ${conn?.status ?? "no row"} — skipping FB call`);
    } else {
      const token = await getFbAccessToken(user.id);
      const accounts = await listAdAccounts(token);
      console.log(`  ✓ Graph API OK — ${accounts.length} ad accounts:`);
      accounts.slice(0, 5).forEach((a: { id?: string; name?: string }) =>
        console.log(`    - ${a.name} (${a.id})`),
      );
    }
  } catch (err) {
    console.log(`  ✗ FAILED: ${(err as Error).message}`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Top-level error:", e);
  process.exit(1);
});
