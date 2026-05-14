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
