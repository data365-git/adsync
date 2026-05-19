import type { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => null),
}));

async function createModulesCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { modulesRouter } = await import("../modules");
  return createCallerFactory(modulesRouter)({ headers: new Headers() });
}

describe("modules.getTemplate", () => {
  it("returns the expected steps for a known template", async () => {
    const caller = await createModulesCaller();

    const result = await caller.getTemplate({
      templateId: "tmpl_daily_campaign",
    });

    expect(result.id).toBe("tmpl_daily_campaign");
    expect(result.name).toContain("Daily campaign metrics");
    expect(result.steps).toHaveLength(3);
    expect(result.steps.map((step) => step.moduleType)).toEqual([
      "trigger.schedule",
      "fb.campaign_insights",
      "sheets.upsert",
    ]);
  });

  it("throws NOT_FOUND for a bogus template id", async () => {
    const caller = await createModulesCaller();

    await expect(
      caller.getTemplate({ templateId: "bogus_template" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND" satisfies TRPCError["code"],
    });
  });
});
