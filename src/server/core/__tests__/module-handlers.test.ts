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
    "sheets.delete_row",
    "sheets.get_row",
    "sheets.create_tab",
    "bitrix.find_leads",
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
      readTabRows: vi.fn(),
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
      readTabRows: vi.fn(),
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
      readTabRows: vi.fn(),
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
      readTabRows: vi.fn(),
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
      readTabRows: vi.fn(),
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
      readTabRows: vi.fn(),
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

// ── New contract tests for sheets write modules ───────────────────────────────

describe("buildRowFromMapping", () => {
  it("interpolates token expressions against the upstream row", async () => {
    const { buildRowFromMapping } = await import("../module-handlers");
    const result = buildRowFromMapping(
      { name: "Alice", email: "alice@example.com" },
      { name: "Hello {{name}}", email: "{{email}}" },
    );
    expect(result).toEqual({ name: "Hello Alice", email: "alice@example.com" });
  });

  it("falls back to upstream row value when valueExpr is empty (backwards compat)", async () => {
    const { buildRowFromMapping } = await import("../module-handlers");
    const result = buildRowFromMapping(
      { name: "Bob", score: 42 },
      { name: "", score: "" },
    );
    expect(result).toEqual({ name: "Bob", score: 42 });
  });

  it("uses literal string when no tokens present", async () => {
    const { buildRowFromMapping } = await import("../module-handlers");
    const result = buildRowFromMapping(
      { name: "Charlie" },
      { status: "Pending" },
    );
    expect(result).toEqual({ status: "Pending" });
  });
});

describe("sheetsAppendHandler — new Record contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("applies token interpolation from mappedFields Record", async () => {
    const appendRowsSpy = vi.fn(async () => undefined);
    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: appendRowsSpy,
      upsertRows: vi.fn(),
      findRows: vi.fn(),
      readTabRows: vi.fn(),
      updateRow: vi.fn(),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.append");

    const fakeStep = {
      id: "step_append",
      moduleType: "sheets.append",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        mappedFields: { name: "Hello {{name}}", email: "{{email}}" },
      },
      position: 2,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [{ name: "Alice", email: "alice@example.com" }],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");
    expect(result.rowCount).toBe(1);
    expect(appendRowsSpy).toHaveBeenCalledWith(
      "u",
      "sheet_abc",
      "Leads",
      [{ name: "Hello Alice", email: "alice@example.com" }],
    );
  });

  it("coerces legacy string[] mappedFields and copies upstream column values", async () => {
    const appendRowsSpy = vi.fn(async () => undefined);
    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: appendRowsSpy,
      upsertRows: vi.fn(),
      findRows: vi.fn(),
      readTabRows: vi.fn(),
      updateRow: vi.fn(),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.append");

    const fakeStep = {
      id: "step_append_legacy",
      moduleType: "sheets.append",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        // Legacy: saved as a plain string array
        mappedFields: ["name", "email"],
      },
      position: 2,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [{ name: "Bob", email: "bob@example.com", extra: "ignored" }],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");
    expect(result.rowCount).toBe(1);
    expect(appendRowsSpy).toHaveBeenCalledWith(
      "u",
      "sheet_abc",
      "Leads",
      [{ name: "Bob", email: "bob@example.com" }],
    );
  });
});

describe("sheetsUpdateRowHandler — new Record contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("builds the write row with token interpolation from mappedFields Record", async () => {
    const updateRowSpy = vi.fn(async () => ({
      row: 5,
      updatedFields: ["name", "status"],
    }));

    vi.doMock("~/integrations/google/sheets-client", () => ({
      appendRows: vi.fn(),
      upsertRows: vi.fn(),
      findRows: vi.fn(),
      readTabRows: vi.fn(),
      updateRow: updateRowSpy,
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("sheets.update_row");

    const fakeStep = {
      id: "step_upd2",
      moduleType: "sheets.update_row",
      config: {
        spreadsheetId: "sheet_abc",
        tabName: "Leads",
        rowIdentifier: "id=99",
        mappedFields: { name: "{{name}}", status: "Active" },
      },
      position: 3,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [{ name: "Carol", status: "Pending" }],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");
    expect(result.rowCount).toBe(1);
    expect(updateRowSpy).toHaveBeenCalledWith(
      "u",
      "sheet_abc",
      "Leads",
      "id=99",
      { name: "Carol", status: "Active" },
    );
  });
});

describe("bitrixCreateLeadHandler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a lead and returns the new leadId", async () => {
    const createLeadSpy = vi.fn(async () => ({ leadId: "4242" }));
    vi.doMock("~/server/bitrix24/client", () => ({
      call: vi.fn(),
      batch: vi.fn(),
      createLead: createLeadSpy,
      getLeadUrl: vi.fn(() => null),
      updateLead: vi.fn(),
    }));
    vi.doMock("~/integrations/bitrix/oauth", () => ({
      getPortalAuth: vi.fn(),
      getPortalOrigin: vi.fn(async () => "https://example.bitrix24.com"),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("bitrix.create_lead");

    const fakeStep = {
      id: "step_create",
      moduleType: "bitrix.create_lead",
      config: {
        portalId: "portal_abc",
        title: "Website inquiry",
        name: "Alice",
        lastName: "Smith",
        phone: "+1-555-1234",
        email: "alice@example.com",
        sourceId: "WEB",
        comments: "from contact form",
      },
      position: 2,
    } as unknown as Parameters<typeof handler>[0];

    const calls: Array<[number, unknown]> = [];
    const fakeCtx = {
      setOutput: (pos: number, val: unknown) => calls.push([pos, val]),
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");

    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([
      expect.objectContaining({
        leadId: "4242",
        leadUrl: "https://example.bitrix24.com/crm/lead/details/4242/",
      }),
    ]);
    expect(createLeadSpy).toHaveBeenCalledTimes(1);
    expect(createLeadSpy).toHaveBeenCalledWith(
      {
        title: "Website inquiry",
        name: "Alice",
        lastName: "Smith",
        phone: "+1-555-1234",
        email: "alice@example.com",
        sourceId: "WEB",
        comments: "from contact form",
      },
      "u",
      { portalId: "portal_abc" },
    );
    expect(calls.length).toBe(1);
  });

  it("throws MISSING_PORTAL_ID when no portalId is configured", async () => {
    vi.doMock("~/server/bitrix24/client", () => ({
      call: vi.fn(),
      batch: vi.fn(),
      createLead: vi.fn(),
      getLeadUrl: vi.fn(),
      updateLead: vi.fn(),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("bitrix.create_lead");

    const fakeStep = {
      id: "step_create",
      moduleType: "bitrix.create_lead",
      config: { title: "X", name: "Y", sourceId: "WEB" },
      position: 1,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/MISSING_PORTAL_ID/);
  });

  it("propagates BitrixError from createLead", async () => {
    vi.doMock("~/server/bitrix24/client", () => ({
      call: vi.fn(),
      batch: vi.fn(),
      createLead: vi.fn(async () => {
        throw new Error("BitrixError: INVALID_INPUT");
      }),
      getLeadUrl: vi.fn(() => null),
      updateLead: vi.fn(),
    }));
    vi.doMock("~/integrations/bitrix/oauth", () => ({
      getPortalAuth: vi.fn(),
      getPortalOrigin: vi.fn(async () => null),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("bitrix.create_lead");

    const fakeStep = {
      id: "step_create",
      moduleType: "bitrix.create_lead",
      config: {
        portalId: "portal_abc",
        title: "X",
        name: "Y",
        sourceId: "BOGUS",
      },
      position: 1,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/INVALID_INPUT/);
  });
});

describe("bitrixUpdateLeadHandler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("updates a lead by id and returns the leadId + updated flag", async () => {
    const updateLeadSpy = vi.fn(async () => ({ leadId: "4242", updated: true }));
    vi.doMock("~/server/bitrix24/client", () => ({
      call: vi.fn(),
      batch: vi.fn(),
      createLead: vi.fn(),
      getLeadUrl: vi.fn(),
      updateLead: updateLeadSpy,
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("bitrix.update_lead");

    const fakeStep = {
      id: "step_upd_lead",
      moduleType: "bitrix.update_lead",
      config: {
        portalId: "portal_abc",
        leadId: "4242",
        title: "Updated title",
        statusId: "IN_PROCESS",
        comments: "follow-up scheduled",
      },
      position: 3,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    const result = await handler(fakeStep, fakeCtx, "u");

    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([
      expect.objectContaining({ leadId: "4242", updated: true }),
    ]);
    expect(updateLeadSpy).toHaveBeenCalledWith(
      {
        leadId: "4242",
        title: "Updated title",
        statusId: "IN_PROCESS",
        comments: "follow-up scheduled",
      },
      "u",
      { portalId: "portal_abc" },
    );
  });

  it("throws MISSING_PORTAL_ID when no portalId is configured", async () => {
    vi.doMock("~/server/bitrix24/client", () => ({
      call: vi.fn(),
      batch: vi.fn(),
      createLead: vi.fn(),
      getLeadUrl: vi.fn(),
      updateLead: vi.fn(),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("bitrix.update_lead");

    const fakeStep = {
      id: "step_upd_lead",
      moduleType: "bitrix.update_lead",
      config: { leadId: "4242", title: "X" },
      position: 1,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/MISSING_PORTAL_ID/);
  });

  it("propagates BitrixError from updateLead", async () => {
    vi.doMock("~/server/bitrix24/client", () => ({
      call: vi.fn(),
      batch: vi.fn(),
      createLead: vi.fn(),
      getLeadUrl: vi.fn(),
      updateLead: vi.fn(async () => {
        throw new Error("BitrixError: ACCESS_DENIED");
      }),
    }));

    const mod = await import("../module-handlers");
    const handler = mod.getHandler("bitrix.update_lead");

    const fakeStep = {
      id: "step_upd_lead",
      moduleType: "bitrix.update_lead",
      config: { portalId: "portal_abc", leadId: "4242", title: "X" },
      position: 1,
    } as unknown as Parameters<typeof handler>[0];

    const fakeCtx = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- test stub
      setOutput: () => {},
      getUpstreamRows: () => [],
    } as unknown as Parameters<typeof handler>[1];

    await expect(handler(fakeStep, fakeCtx, "u")).rejects.toThrow(/ACCESS_DENIED/);
  });
});
