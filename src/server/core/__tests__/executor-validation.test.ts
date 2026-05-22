import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ExecutorModule from "../executor";

vi.mock("server-only", () => ({}));

type MockStep = {
  id: string;
  scenarioId: string;
  position: number;
  moduleType: string;
  config: Record<string, unknown>;
};

type MockScenario = {
  id: string;
  userId: string;
  name: string;
  steps: MockStep[];
};

const state = vi.hoisted(() => ({
  scenario: undefined as MockScenario | undefined,
  runUpdates: [] as Array<Record<string, unknown>>,
  logs: [] as Array<{ level: string; message: string; meta?: unknown }>,
}));

vi.mock("~/server/db", () => ({
  db: {
    scenario: {
      findUnique: vi.fn(async () => state.scenario),
      update: vi.fn(async () => undefined),
    },
    run: {
      create: vi.fn(async () => ({
        id: "run_test",
        status: "RUNNING",
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.runUpdates.push(data);
        return { id: "run_test", ...data };
      }),
    },
    runLog: {
      create: vi.fn(async ({ data }: { data: { level: string; message: string; meta?: unknown } }) => {
        state.logs.push(data);
        return data;
      }),
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock("../module-handlers", () => ({
  getHandler: (moduleType: string) => {
    return async (
      step: MockStep,
      ctx: { setOutput: (position: number, rows: unknown[]) => void; getUpstreamRows: (position: number) => unknown[] },
    ) => {
      if (moduleType === "trigger.manual") return { rowCount: 0 };
      if (moduleType === "trigger.webhook") {
        const rows = [{ name: "Alice" }];
        ctx.setOutput(step.position, rows);
        return { rowCount: 1, rows };
      }
      if (moduleType === "sheets.find_rows") {
        ctx.setOutput(step.position, []);
        return { rowCount: 0, rows: [] };
      }
      if (moduleType === "sheets.append") {
        expect(ctx.getUpstreamRows(step.position)).toEqual([]);
        return { rowCount: 0, rows: [], message: "0 upstream rows; skipped" };
      }
      return { rowCount: 1, rows: [{ ok: true }] };
    };
  },
}));

vi.mock("../notifier", () => ({
  notifyOnFailure: vi.fn(),
}));

function setScenario(steps: MockStep[]): void {
  state.scenario = {
    id: "scenario_test",
    userId: "user_test",
    name: "Scenario Test",
    steps,
  };
}

function step(position: number, moduleType: string, config: Record<string, unknown>): MockStep {
  return {
    id: `step_${position}`,
    scenarioId: "scenario_test",
    position,
    moduleType,
    config,
  };
}

async function loadExecutor(): Promise<typeof ExecutorModule> {
  return import("../executor");
}

beforeEach(() => {
  state.scenario = undefined;
  state.runUpdates = [];
  state.logs = [];
});

describe("executeRun validation and logs", () => {
  it("marks invalid config FAILED with a descriptive errorMessage", async () => {
    setScenario([
      step(1, "trigger.manual", {}),
      step(2, "bitrix.create_lead", { name: "Alice", sourceId: "WEB" }),
    ]);
    const executor = await loadExecutor();

    await executor.executeRun("scenario_test", "MANUAL", "user_test");

    expect(state.runUpdates.at(-1)).toMatchObject({
      status: "FAILED",
      errorMessage:
        "Step 2 (bitrix.create_lead): missing required field 'title'",
    });
  });

  it("keeps empty upstream as rowCount=0 and run status SUCCESS", async () => {
    setScenario([
      step(1, "trigger.manual", {}),
      step(2, "sheets.find_rows", { spreadsheetId: "sheet", tabName: "Sheet1" }),
      step(3, "sheets.append", {
        spreadsheetId: "sheet",
        tabName: "Mirror",
        mappedFields: { name: "" },
      }),
    ]);
    const executor = await loadExecutor();

    await executor.executeRun("scenario_test", "MANUAL", "user_test");

    expect(state.runUpdates.at(-1)).toMatchObject({ status: "SUCCESS" });
    const skippedLog = state.logs.find(
      (log) => log.message === "0 upstream rows; skipped",
    );
    expect(skippedLog?.meta).toMatchObject({ rowCount: 0 });
  });

  it("adds unknown-token mapping warnings to the run log", async () => {
    setScenario([
      step(1, "trigger.webhook", {}),
      step(2, "bitrix.create_lead", {
        title: "Lead from {{foo}}",
        name: "Alice",
        sourceId: "WEB",
      }),
    ]);
    const executor = await loadExecutor();

    await executor.executeRun("scenario_test", "MANUAL", "user_test");

    const completedLog = state.logs.find(
      (log) => log.message === "Completed step 2: bitrix.create_lead",
    );
    expect(completedLog?.meta).toMatchObject({ warnings: ["foo"] });
  });
});
