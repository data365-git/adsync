import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("fbListAdAccountsHandler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the user's ad accounts as HandlerResult rows", async () => {
    const fakeAccounts = [
      { id: "act_111", name: "Account One" },
      { id: "act_222", name: "Account Two" },
    ];

    vi.doMock("~/integrations/facebook/graph-client", () => ({
      listAdAccounts: vi.fn(async (_userId: string) => fakeAccounts),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("fb.list_ad_accounts");

    const fakeStep = {
      id: "step_fb_list",
      moduleType: "fb.list_ad_accounts",
      config: {},
      position: 1,
    } as unknown as Parameters<typeof handler>[0];
    const calls: Array<[number, unknown]> = [];
    const fakeCtx = {
      setOutput: (pos: number, val: unknown) => {
        calls.push([pos, val]);
      },
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "user_test");

    expect(result).toEqual({ rowCount: 2, rows: fakeAccounts });
    expect(calls).toEqual([[1, fakeAccounts]]);
  });

  it("propagates graph-client errors (e.g. token expired)", async () => {
    vi.doMock("~/integrations/facebook/graph-client", () => ({
      listAdAccounts: vi.fn(async () => {
        throw new Error("FB Graph API error: token expired");
      }),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("fb.list_ad_accounts");

    const fakeStep = {
      id: "step_fb_list",
      moduleType: "fb.list_ad_accounts",
      config: {},
      position: 1,
    } as unknown as Parameters<typeof handler>[0];
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const fakeCtx = { setOutput: () => {} } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/token expired/);
  });
});

describe("sheetsFindRowsHandler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns matched rows from the sheet via findRows()", async () => {
    const fakeMatches = [
      { row: 2, email: "a@example.com", name: "Alice" },
      { row: 7, email: "a@example.com", name: "Alice P" },
    ];

    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(async () => fakeMatches),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.find_rows");

    const fakeStep = {
      id: "step_find",
      moduleType: "sheets.find_rows",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        searchColumn: "email",
        searchValue: "a@example.com",
      },
      position: 2,
    } as unknown as Parameters<typeof handler>[0];

    const calls: Array<[number, unknown]> = [];
    const fakeCtx = {
      setOutput: (pos: number, val: unknown) => calls.push([pos, val]),
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");

    expect(result).toEqual({
      rowCount: 2,
      rows: fakeMatches,
      sheetsUrl: "https://docs.google.com/spreadsheets/d/sheet_abc",
    });
    expect(calls).toEqual([[2, fakeMatches]]);
  });

  it("returns empty result when findRows returns nothing", async () => {
    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(async () => []),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.find_rows");

    const fakeStep = {
      id: "step_find",
      moduleType: "sheets.find_rows",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        searchColumn: "email",
        searchValue: "missing@example.com",
      },
      position: 1,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.sheetsUrl).toBe("https://docs.google.com/spreadsheets/d/sheet_abc");
  });

  it("propagates sheets-client errors", async () => {
    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(async () => {
        throw new Error("Google Sheets API error: 403");
      }),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.find_rows");

    const fakeStep = {
      id: "step_find",
      moduleType: "sheets.find_rows",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        searchColumn: "email",
        searchValue: "a@example.com",
      },
      position: 1,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/Google Sheets API error/);
  });
});

describe("sheetsUpdateRowHandler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("updates the identified row using the first projected upstream row", async () => {
    const updateRowSpy = vi.fn(async () => ({
      row: 3,
      updatedFields: ["status", "updatedAt"],
    }));

    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(),
      updateRow: updateRowSpy,
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.update_row");

    const fakeStep = {
      id: "step_upd",
      moduleType: "sheets.update_row",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        rowIdentifier: "id=42",
        mappedFields: { status: "{{upstream.status}}", updatedAt: "{{upstream.ts}}" },
      },
      position: 3,
    } as unknown as Parameters<typeof handler>[0];

    const upstreamRow = { status: "active", ts: "2026-05-14T10:00:00Z" };
    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [upstreamRow],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");

    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([
      { row: 3, status: "updated", updatedFields: ["status", "updatedAt"] },
    ]);
    expect(result.sheetsUrl).toBe("https://docs.google.com/spreadsheets/d/sheet_abc");
    expect(updateRowSpy).toHaveBeenCalledTimes(1);
    expect(updateRowSpy).toHaveBeenCalledWith(
      "u",
      "sheet_abc",
      "Leads",
      "id=42",
      expect.any(Object),
    );
  });

  it("returns rowCount=0 when there are no upstream rows to project", async () => {
    const updateRowSpy = vi.fn();
    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(),
      updateRow: updateRowSpy,
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.update_row");

    const fakeStep = {
      id: "step_upd",
      moduleType: "sheets.update_row",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        rowIdentifier: "3",
        mappedFields: { status: "{{upstream.status}}" },
      },
      position: 2,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");
    expect(result.rowCount).toBe(0);
    expect(updateRowSpy).not.toHaveBeenCalled();
  });

  it("propagates sheets-client errors", async () => {
    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(),
      updateRow: vi.fn(async () => {
        throw new Error('No row found where id = "42"');
      }),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.update_row");

    const fakeStep = {
      id: "step_upd",
      moduleType: "sheets.update_row",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        rowIdentifier: "id=42",
        mappedFields: { status: "{{upstream.status}}" },
      },
      position: 2,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [{ status: "x" }],
    } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/No row found/);
  });
});
