import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";

/** Name of the single template scenario seeded for brand-new users. */
const DEFAULT_SCENARIO_NAME = "Daily Google Sheets → Bitrix24 (setup needed)";

/**
 * Seed one pre-built template scenario for a brand-new user so they don't land
 * on an empty scenarios list. The scenario is fully wired (steps + field
 * mappings); the user only has to fill in their spreadsheet ID and Bitrix24
 * portal before it can run, so it's created `enabled: false`.
 *
 * Idempotent: returns immediately if the user already has any scenario. The
 * count is re-checked here (not only by the caller) so concurrent first visits
 * at worst create two identical templates rather than diverging.
 */
export async function seedDefaultScenarios(userId: string): Promise<void> {
  const existing = await db.scenario.count({ where: { userId } });
  if (existing > 0) return;

  await db.scenario.create({
    data: {
      userId,
      name: DEFAULT_SCENARIO_NAME,
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
            } as Prisma.InputJsonValue,
          },
          {
            position: 2,
            moduleType: "sheets.get_all_rows",
            config: { spreadsheetId: "", tabName: "" } as Prisma.InputJsonValue,
          },
          {
            position: 3,
            moduleType: "bitrix.create_lead",
            config: {
              portalId: "",
              title: "{{Name}}",
              name: "{{Name}}",
              phone: "{{Phone number}}",
              sourceId: "WEB",
              comments:
                "UTM: {{utmsource}} | {{Additional informations}} | Created: {{Created time}}",
            } as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });
}
