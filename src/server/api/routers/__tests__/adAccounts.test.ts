import type { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adAccountFindUniqueMock = vi.hoisted(() => vi.fn());
const adAccountUpdateMock = vi.hoisted(() => vi.fn());
const scenarioFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user_1" },
  })),
}));

vi.mock("~/server/db", () => ({
  db: {
    adAccount: {
      findMany: vi.fn(),
      findUnique: adAccountFindUniqueMock,
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: adAccountUpdateMock,
      delete: vi.fn(),
    },
    scenario: {
      findFirst: scenarioFindFirstMock,
    },
  },
}));

vi.mock("~/server/core/executor", () => ({
  executeRun: vi.fn(),
}));

async function createAdAccountsCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { adAccountsRouter } = await import("../adAccounts");
  return createCallerFactory(adAccountsRouter)({ headers: new Headers() });
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: "ad_1",
    userId: "user_1",
    label: "Primary",
    fbAccountId: "act_123",
    enabled: true,
    levels: ["CAMPAIGN"],
    metrics: ["spend"],
    dateWindowDays: 7,
    spreadsheetId: "sheet_1",
    campaignTabName: "Campaigns",
    adTabName: "Ads",
    cronExpression: "0 6 * * *",
    timezone: "Asia/Tashkent",
    isPinned: false,
    lastSyncedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    _count: { scenarios: 0 },
    ...overrides,
  };
}

describe("adAccounts.setPinned", () => {
  beforeEach(() => {
    vi.resetModules();
    adAccountFindUniqueMock.mockReset();
    adAccountUpdateMock.mockReset();
    scenarioFindFirstMock.mockReset();
    scenarioFindFirstMock.mockResolvedValue(null);
  });

  it("toggles pinned state for the owner", async () => {
    adAccountFindUniqueMock.mockResolvedValue({ userId: "user_1" });
    adAccountUpdateMock.mockResolvedValue(account({ isPinned: true }));

    const caller = await createAdAccountsCaller();
    const result = await caller.setPinned({ id: "ad_1", isPinned: true });

    expect(result.isPinned).toBe(true);
    expect(adAccountUpdateMock).toHaveBeenCalledWith({
      where: { id: "ad_1" },
      data: { isPinned: true },
      include: { _count: { select: { scenarios: true } } },
    });
  });

  it("throws FORBIDDEN for a non-owner", async () => {
    adAccountFindUniqueMock.mockResolvedValue({ userId: "user_2" });

    const caller = await createAdAccountsCaller();

    await expect(
      caller.setPinned({ id: "ad_1", isPinned: true }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN" satisfies TRPCError["code"],
    });
    expect(adAccountUpdateMock).not.toHaveBeenCalled();
  });
});

describe("adAccounts.syncNow", () => {
  beforeEach(() => {
    vi.resetModules();
    adAccountFindUniqueMock.mockReset();
    adAccountUpdateMock.mockReset();
  });

  it("updates lastSyncedAt", async () => {
    adAccountFindUniqueMock.mockResolvedValue({ userId: "user_1" });
    adAccountUpdateMock.mockResolvedValue(account());

    const caller = await createAdAccountsCaller();
    const result = await caller.syncNow({ id: "ad_1" });

    expect(result.ok).toBe(true);
    expect(result.syncedAt).toBeInstanceOf(Date);
    expect(adAccountUpdateMock).toHaveBeenCalledWith({
      where: { id: "ad_1" },
      data: { lastSyncedAt: result.syncedAt },
    });
  });
});

describe("healthDot", () => {
  it("returns green, amber, or red from sync age", async () => {
    const { healthDot } = await import("~/components/ad-accounts/health");
    const now = new Date("2026-05-21T12:00:00.000Z");

    expect(healthDot(new Date("2026-05-21T11:30:00.000Z"), now)).toBe("green");
    expect(healthDot(new Date("2026-05-21T10:00:00.000Z"), now)).toBe("amber");
    expect(healthDot(new Date("2026-05-20T11:00:00.000Z"), now)).toBe("red");
    expect(healthDot(null, now)).toBe("red");
  });
});
