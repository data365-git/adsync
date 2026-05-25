import { beforeEach, describe, expect, it, vi } from "vitest";

const connectionFindUniqueMock = vi.hoisted(() => vi.fn());
const driveAboutGetMock = vi.hoisted(() => vi.fn());
const getAuthedClientMock = vi.hoisted(() => vi.fn());
const getFbAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user_1" },
  })),
}));

vi.mock("~/server/db", () => ({
  db: {
    oAuthConnection: {
      findUnique: connectionFindUniqueMock,
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("~/integrations/google/oauth", () => ({
  getAuthedClient: getAuthedClientMock,
}));

vi.mock("~/integrations/facebook/graph-client", () => ({
  listAdAccounts: vi.fn(),
}));

vi.mock("~/integrations/facebook/oauth", () => ({
  getFbAccessToken: getFbAccessTokenMock,
}));

vi.mock("~/server/bitrix24/client", () => ({
  call: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    drive: vi.fn(() => ({
      about: {
        get: driveAboutGetMock,
      },
      files: {
        list: vi.fn(),
      },
    })),
    sheets: vi.fn(),
  },
}));

async function createConnectionsCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { connectionsRouter } = await import("../connections");
  return createCallerFactory(connectionsRouter)({ headers: new Headers() });
}

describe("connections.test", () => {
  beforeEach(() => {
    vi.resetModules();
    connectionFindUniqueMock.mockReset();
    driveAboutGetMock.mockReset();
    getAuthedClientMock.mockReset();
    getFbAccessTokenMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());

    connectionFindUniqueMock.mockResolvedValue({
      id: "conn_1",
      userId: "user_1",
      provider: "GOOGLE_SHEETS",
      status: "CONNECTED",
    });
    getAuthedClientMock.mockResolvedValue({ auth: true });
    getFbAccessTokenMock.mockResolvedValue("fb_token");
    driveAboutGetMock.mockResolvedValue({
      data: {
        user: {
          emailAddress: "owner@example.com",
        },
      },
    });
  });

  it("returns ok=true for a valid Google token", async () => {
    const caller = await createConnectionsCaller();

    const result = await caller.test({ provider: "google" });

    expect(result).toMatchObject({
      ok: true,
      asUser: "owner@example.com",
    });
    expect(result.message).toContain("Google Drive responded");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(driveAboutGetMock).toHaveBeenCalledTimes(1);
    expect(driveAboutGetMock).toHaveBeenCalledWith({ fields: "user" });
  });

  it("uses the 60-second cache for duplicate provider tests", async () => {
    const caller = await createConnectionsCaller();

    const first = await caller.test({ provider: "google" });
    const second = await caller.test({ provider: "google" });

    expect(second).toEqual(first);
    // Cache hit: the underlying Drive call only happens once for two test() calls
    expect(driveAboutGetMock).toHaveBeenCalledTimes(1);
  });

  it("returns ok=false with a friendly message for a bad token", async () => {
    driveAboutGetMock.mockRejectedValue(
      new Error("invalid_grant: raw provider error"),
    );
    const caller = await createConnectionsCaller();

    const result = await caller.test({ provider: "google" });

    expect(result).toMatchObject({
      ok: false,
      message: "Connection test failed. Reconnect this provider and try again.",
    });
    expect(result.message).not.toContain("invalid_grant");
  });
});
