/**
 * Creates a ready-made "Google Sheets → Bitrix24 Daily" scenario.
 *
 * Fill in SHEET_ID and TAB_NAME below, then run:
 *   pnpm tsx scripts/seed-daily-sheets-to-bitrix.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ── EDIT THESE TWO LINES ──────────────────────────────────────────────────────
const SHEET_ID = "REPLACE_WITH_YOUR_GOOGLE_SHEET_ID";
const TAB_NAME = "REPLACE_WITH_YOUR_TAB_NAME"; // e.g. "Sheet1", "Leads", "Form responses 1"
// ─────────────────────────────────────────────────────────────────────────────

const USER_EMAIL = "data365.online@gmail.com";
const SCENARIO_NAME = "Google Sheets → Bitrix24 Daily (20:00)";

async function main() {
  if (SHEET_ID === "REPLACE_WITH_YOUR_GOOGLE_SHEET_ID") {
    console.error("❌ Fill in SHEET_ID before running this script.");
    process.exit(1);
  }
  if (TAB_NAME === "REPLACE_WITH_YOUR_TAB_NAME") {
    console.error("❌ Fill in TAB_NAME before running this script.");
    process.exit(1);
  }

  const user = await db.user.findFirstOrThrow({
    where: { email: USER_EMAIL },
    select: { id: true },
  });

  const portal = await db.bitrixPortal.findFirstOrThrow({
    where: { userId: user.id },
    select: { id: true, domain: true },
    orderBy: { connectedAt: "desc" },
  });

  console.log(`Using portal: ${portal.domain} (${portal.id})`);

  // Delete existing scenario with same name so the script is idempotent
  await db.scenario.deleteMany({
    where: { userId: user.id, name: SCENARIO_NAME },
  });

  const scenario = await db.scenario.create({
    data: {
      userId: user.id,
      name: SCENARIO_NAME,
      kind: "CUSTOM",
      enabled: false,
      steps: {
        create: [
          {
            position: 1,
            moduleType: "trigger.schedule",
            config: {
              cronExpression: "0 20 * * *",
              timezone: "Asia/Tashkent",
            },
          },
          {
            position: 2,
            moduleType: "sheets.get_all_rows",
            config: {
              spreadsheetId: SHEET_ID,
              tabName: TAB_NAME,
            },
          },
          {
            position: 3,
            moduleType: "bitrix.create_lead",
            config: {
              portalId: portal.id,
              title: "{{Name}}",
              name: "{{Name}}",
              phone: "{{Phone number}}",
              sourceId: "WEB",
              comments:
                "UTM: {{utmsource}} | {{Additional informations}} | Created: {{Created time}}",
            },
          },
        ],
      },
    },
    select: { id: true },
  });

  console.log(`✅ Scenario created: ${SCENARIO_NAME}`);
  console.log(`   http://localhost:3000/scenarios/${scenario.id}`);
  console.log();
  console.log("Next steps:");
  console.log("  1. Open the link above and verify the steps look right");
  console.log("  2. Click Run once to test before enabling");
  console.log("  3. Toggle Enable to start the 20:00 daily schedule");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
