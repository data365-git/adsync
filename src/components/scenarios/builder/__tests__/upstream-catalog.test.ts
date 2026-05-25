import { describe, expect, it } from "vitest";

import { buildUpstreamCatalog } from "../upstream-catalog";

describe("buildUpstreamCatalog", () => {
  it("uses sheet sample values for upstream Sheets trigger fields", () => {
    const catalog = buildUpstreamCatalog(
      [
        {
          id: "step_1",
          position: 1,
          moduleType: "trigger.watch.sheets_new_rows",
        },
        { id: "step_2", position: 2, moduleType: "bitrix.create_lead" },
      ],
      2,
      {
        columns: ["id", "name", "email"],
        rows: [{ id: "1", name: "Alice", email: "alice@example.com" }],
      },
    );

    expect(catalog).toEqual([
      {
        stepId: "step_1",
        moduleType: "trigger.watch.sheets_new_rows",
        label: "Watch Sheets — New Rows",
        fields: [
          { key: "id", sampleValue: "1" },
          { key: "name", sampleValue: "Alice" },
          { key: "email", sampleValue: "alice@example.com" },
        ],
      },
    ]);
  });

  it("falls back to module sample output for non-Sheets upstream steps", () => {
    const catalog = buildUpstreamCatalog(
      [
        { id: "step_1", position: 1, moduleType: "trigger.schedule" },
        { id: "step_2", position: 2, moduleType: "bitrix.create_lead" },
      ],
      2,
    );

    expect(catalog[0]?.moduleType).toBe("trigger.schedule");
    expect(catalog[0]?.fields.map((field) => field.key)).toContain("runId");
  });
});
