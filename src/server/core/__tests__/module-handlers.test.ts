import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("notImplementedHandler", () => {
  it("throws MODULE_NOT_IMPLEMENTED with the module type name", async () => {
    const { notImplementedHandler } = await import("../module-handlers");
    const fakeStep = {
      id: "step_test",
      moduleType: "sheets.delete_row",
      config: {},
      position: 1,
    } as unknown as Parameters<typeof notImplementedHandler>[0];
    const fakeCtx = {} as unknown as Parameters<typeof notImplementedHandler>[1];

    await expect(
      notImplementedHandler(fakeStep, fakeCtx, "user_test"),
    ).rejects.toThrow(/MODULE_NOT_IMPLEMENTED.*sheets\.delete_row/);
  });
});

describe("HANDLERS routing — deferred modules", () => {
  // Filled from docs/MODULE_AUDIT.md DEFER list. Update this array in lock-step
  // with the audit doc — adding a DEFER type without listing it here is a regression.
  const DEFERRED_TYPES: string[] = [
    "fb.list_ads",
    "fb.get_ad",
    "sheets.delete_row",
    "sheets.get_row",
    "sheets.create_tab",
    "sheets.watch_new_rows",
    "bitrix.find_leads",
    "bitrix.create_deal",
    "bitrix.update_deal",
  ];

  it.each(DEFERRED_TYPES)("routes %s to notImplementedHandler", async (deferredType) => {
    const mod = await import("../module-handlers");
    const handler = mod.getHandler(deferredType);
    const fakeStep = {
      id: "step_x",
      moduleType: deferredType,
      config: {},
      position: 1,
    } as unknown as Parameters<typeof handler>[0];
    const fakeCtx = {} as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/MODULE_NOT_IMPLEMENTED/);
  });
});
