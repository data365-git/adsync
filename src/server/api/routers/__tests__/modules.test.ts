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
      templateId: "tmpl_sheets_to_bitrix",
    });

    expect(result.id).toBe("tmpl_sheets_to_bitrix");
    expect(result.name).toContain("Bitrix24 lead");
    expect(result.steps).toHaveLength(2);
    expect(result.steps.map((step) => step.moduleType)).toEqual([
      "trigger.watch.sheets_new_rows",
      "bitrix.create_lead",
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
