import type { ScenarioStep } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunContext } from "../run-context";

vi.mock("server-only", () => ({}));

function makeWebhookStep(): ScenarioStep {
  return {
    id: "step_webhook",
    scenarioId: "scenario_1",
    position: 1,
    moduleType: "trigger.webhook",
    config: {},
  };
}

describe("trigger.webhook handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("passes through a seeded webhook payload", async () => {
    const payload = {
      receivedAt: "2026-05-19T00:00:00.000Z",
      method: "POST",
      headers: { "x-request-id": "req_1" },
      body: { event: "lead.created" },
    };
    const ctx = new RunContext();
    ctx.setOutput(1, [payload]);

    const { getHandler } = await import("../module-handlers");
    const result = await getHandler("trigger.webhook")(
      makeWebhookStep(),
      ctx,
      "user_1",
    );

    expect(result).toEqual({ rowCount: 1, rows: [payload] });
  });

  it("returns a fallback sample row when no payload is seeded", async () => {
    const ctx = new RunContext();
    const { getHandler } = await import("../module-handlers");
    const result = await getHandler("trigger.webhook")(
      makeWebhookStep(),
      ctx,
      "user_1",
    );

    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([
      expect.objectContaining({
        _source: "webhook_sample",
        event: "test",
      }),
    ]);
    expect(ctx.getOutput(1)).toEqual(result.rows);
  });
});

describe("executeRun webhook payload seeding", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("seeds position 1 when webhookTriggerPayload is provided", async () => {
    const observedRows: unknown[][] = [];
    const handler = vi.fn(async (_step: ScenarioStep, ctx: RunContext) => {
      observedRows.push(ctx.getOutput(1));
      return { rowCount: 1, rows: ctx.getOutput(1) };
    });
    const payload = { body: { event: "lead.created" } };
    const runCreate = vi.fn(async () => ({ id: "run_1" }));
    const runUpdate = vi.fn(async () => ({ id: "run_1" }));
    const runLogCreate = vi.fn(async () => ({ id: "log_1" }));
    const scenarioUpdate = vi.fn(async () => ({ id: "scenario_1" }));

    vi.doMock("~/server/db", () => ({
      db: {
        scenario: {
          findUnique: vi.fn(async () => ({
            id: "scenario_1",
            userId: "user_1",
            steps: [makeWebhookStep()],
          })),
          update: scenarioUpdate,
        },
        run: {
          create: runCreate,
          update: runUpdate,
        },
        runLog: {
          create: runLogCreate,
          findMany: vi.fn(async () => []),
        },
      },
    }));
    vi.doMock("../module-handlers", () => ({
      getHandler: vi.fn(() => handler),
    }));

    const { executeRun } = await import("../executor");
    const runId = await executeRun("scenario_1", "MANUAL", "user_1", {
      webhookTriggerPayload: payload,
    });

    expect(runId).toBe("run_1");
    expect(observedRows).toEqual([[payload]]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(runCreate).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        scenarioId: "scenario_1",
        trigger: "MANUAL",
        status: "RUNNING",
      },
    });
    expect(runLogCreate).toHaveBeenCalledTimes(2);
    expect(runUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({ status: "SUCCESS" }) as Record<string, unknown>,
      }),
    );
    expect(scenarioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "scenario_1" },
        data: expect.objectContaining({ lastRunStatus: "SUCCESS" }) as Record<string, unknown>,
      }),
    );
  });
});
