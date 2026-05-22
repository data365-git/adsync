import { beforeEach, describe, expect, it, vi } from "vitest";

const userSettingsUpsertMock = vi.hoisted(() => vi.fn());
const userUpdateMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const scenarioFindManyMock = vi.hoisted(() => vi.fn());
const runFindManyMock = vi.hoisted(() => vi.fn());
const runDeleteManyMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user_1" },
  })),
}));

vi.mock("~/server/db", () => ({
  db: {
    $transaction: transactionMock,
    userSettings: {
      upsert: userSettingsUpsertMock,
    },
    user: {
      update: userUpdateMock,
      delete: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    scenario: {
      findMany: scenarioFindManyMock,
    },
    run: {
      findMany: runFindManyMock,
      deleteMany: runDeleteManyMock,
    },
  },
}));

async function createUserSettingsCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { userSettingsRouter } = await import("../userSettings");
  return createCallerFactory(userSettingsRouter)({ headers: new Headers() });
}

async function createSettingsCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { settingsRouter } = await import("../settings");
  return createCallerFactory(settingsRouter)({ headers: new Headers() });
}

describe("userSettings.update", () => {
  beforeEach(() => {
    vi.resetModules();
    userSettingsUpsertMock.mockReset();
    userUpdateMock.mockReset();
    transactionMock.mockReset();
  });

  it("round-trips partial updates", async () => {
    userSettingsUpsertMock.mockResolvedValue({
      userId: "user_1",
      emailOnFailure: true,
      genericWebhookUrl: null,
      quietHoursStart: null,
      quietHoursEnd: null,
      schedulesPaused: false,
      defaultSheetTemplate: null,
      weekStartsOn: 1,
      displayName: null,
      defaultAdAccountBehavior: null,
    });

    const caller = await createUserSettingsCaller();
    const result = await caller.update({ emailOnFailure: true });

    expect(result.emailOnFailure).toBe(true);
    expect(userSettingsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        create: { userId: "user_1", emailOnFailure: true },
        update: { emailOnFailure: true },
      }),
    );
  });

  it("flips the schedulesPaused flag and mirrors it on User", async () => {
    const settings = {
      userId: "user_1",
      emailOnFailure: false,
      genericWebhookUrl: null,
      quietHoursStart: null,
      quietHoursEnd: null,
      schedulesPaused: true,
      defaultSheetTemplate: null,
      weekStartsOn: 1,
      displayName: null,
      defaultAdAccountBehavior: null,
    };
    userSettingsUpsertMock.mockReturnValue(settings);
    userUpdateMock.mockReturnValue({ id: "user_1" });
    transactionMock.mockImplementation(async (operations: unknown[]) => operations);

    const caller = await createUserSettingsCaller();
    const result = await caller.update({ schedulesPaused: true });

    expect(result.schedulesPaused).toBe(true);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { schedulesPaused: true },
      select: { id: true },
    });
  });
});

describe("settings.exportData", () => {
  beforeEach(() => {
    vi.resetModules();
    scenarioFindManyMock.mockReset();
    runFindManyMock.mockReset();
    runDeleteManyMock.mockReset();
  });

  it("includes scenarios and runs for the current user", async () => {
    scenarioFindManyMock.mockResolvedValue([{ id: "scenario_1" }]);
    runFindManyMock.mockResolvedValue([{ id: "run_1" }]);

    const caller = await createSettingsCaller();
    const result = await caller.exportData();

    expect(result.scenarios).toEqual([{ id: "scenario_1" }]);
    expect(result.runs).toEqual([{ id: "run_1" }]);
    expect(scenarioFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } }),
    );
    expect(runFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } }),
    );
  });
});
