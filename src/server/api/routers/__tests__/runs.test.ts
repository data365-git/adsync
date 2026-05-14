import type { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runFindUniqueMock = vi.hoisted(() => vi.fn());
const executeRunMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user_1" },
  })),
}));

vi.mock("~/server/db", () => ({
  db: {
    run: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: runFindUniqueMock,
    },
    scenario: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("~/server/core/executor", () => ({
  executeRun: executeRunMock,
}));

async function createRunsCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { runsRouter } = await import("../runs");
  return createCallerFactory(runsRouter)({ headers: new Headers() });
}

describe("runs.getDetail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a run with logs and steps grouped by position", async () => {
    const run = {
      id: "run_1",
      userId: "user_1",
      scenarioId: "scenario_1",
      trigger: "MANUAL" as const,
      status: "SUCCESS" as const,
      startedAt: new Date("2026-05-14T10:00:00.000Z"),
      finishedAt: new Date("2026-05-14T10:00:02.000Z"),
      durationMs: 2000,
      campaignRowsWritten: 0,
      adRowsWritten: 0,
      errorMessage: null,
      sheetsUrl: null,
      scenario: {
        id: "scenario_1",
        steps: [
          {
            id: "step_1",
            scenarioId: "scenario_1",
            position: 1,
            moduleType: "trigger.manual",
            config: {},
          },
          {
            id: "step_2",
            scenarioId: "scenario_1",
            position: 2,
            moduleType: "bitrix.create_lead",
            config: { title: "Lead" },
          },
        ],
      },
      logs: [
        {
          id: "log_1",
          runId: "run_1",
          level: "INFO" as const,
          message: "Starting step 1",
          meta: { position: 1 },
          ts: new Date("2026-05-14T10:00:00.000Z"),
        },
        {
          id: "log_2",
          runId: "run_1",
          level: "INFO" as const,
          message: "Completed step 2",
          meta: { position: 2, rowCount: 1 },
          ts: new Date("2026-05-14T10:00:01.000Z"),
        },
      ],
    };
    runFindUniqueMock.mockResolvedValue(run);

    const caller = await createRunsCaller();
    const result = await caller.getDetail({ id: "run_1" });

    expect(result.run.id).toBe("run_1");
    expect(result.scenario.id).toBe("scenario_1");
    expect(result.stepsByPosition[1]?.moduleType).toBe("trigger.manual");
    expect(result.stepsByPosition[2]?.moduleType).toBe("bitrix.create_lead");
    expect(result.logsByPosition[1]?.map((log) => log.id)).toEqual(["log_1"]);
    expect(result.logsByPosition[2]?.map((log) => log.id)).toEqual(["log_2"]);
    expect(runFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "run_1" },
      include: {
        scenario: { include: { steps: { orderBy: { position: "asc" } } } },
        logs: { orderBy: { ts: "asc" } },
      },
    });
  });

  it("throws NOT_FOUND when the run does not exist", async () => {
    runFindUniqueMock.mockResolvedValue(null);

    const caller = await createRunsCaller();

    await expect(caller.getDetail({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND" satisfies TRPCError["code"],
    });
  });
});

describe("runs.rerunFromStep", () => {
  beforeEach(() => {
    vi.resetModules();
    runFindUniqueMock.mockReset();
    executeRunMock.mockReset();
  });

  it("starts a new manual run from the requested step", async () => {
    runFindUniqueMock.mockResolvedValue({
      id: "run_1",
      userId: "user_1",
      scenarioId: "scenario_1",
      scenario: {
        steps: [
          { id: "step_1", position: 1 },
          { id: "step_2", position: 2 },
        ],
      },
    });
    executeRunMock.mockResolvedValue("run_2");

    const caller = await createRunsCaller();
    const result = await caller.rerunFromStep({ runId: "run_1", position: 2 });

    expect(result).toEqual({ runId: "run_2" });
    expect(executeRunMock).toHaveBeenCalledWith("scenario_1", "MANUAL", "user_1", {
      rerunOf: "run_1",
      rerunFromPosition: 2,
    });
  });

  it("throws BAD_REQUEST for a position beyond the scenario step count", async () => {
    runFindUniqueMock.mockResolvedValue({
      id: "run_1",
      userId: "user_1",
      scenarioId: "scenario_1",
      scenario: {
        steps: [{ id: "step_1", position: 1 }],
      },
    });

    const caller = await createRunsCaller();

    await expect(
      caller.rerunFromStep({ runId: "run_1", position: 2 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST" satisfies TRPCError["code"],
    });
    expect(executeRunMock).not.toHaveBeenCalled();
  });
});
