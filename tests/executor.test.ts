/**
 * Executor unit tests.
 *
 * Mocks:
 *   - ~/integrations/facebook/graph-client (Agent C — not yet in worktree)
 *   - ~/integrations/google/sheets-client  (Agent B — not yet in worktree)
 *   - ~/server/db                          (Prisma — avoid DB calls in unit tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JsonValue } from "@prisma/client/runtime/library";
import { RunContext } from "~/server/core/run-context";

// ── Mock Agent B/C integrations ───────────────────────────────────────────────

vi.mock("~/integrations/facebook/graph-client", () => ({
  getAccountInsights: vi.fn().mockResolvedValue([]),
  getCampaignInsights: vi.fn().mockResolvedValue([
    { campaign_id: "c1", impressions: 100 },
    { campaign_id: "c2", impressions: 200 },
  ]),
  getAdInsights: vi.fn().mockResolvedValue([]),
}));

vi.mock("~/integrations/google/sheets-client", () => ({
  appendRows: vi.fn().mockResolvedValue(undefined),
  upsertRows: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock Prisma db ────────────────────────────────────────────────────────────

vi.mock("~/server/db", () => ({
  db: {
    scenario: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    run: {
      create: vi.fn().mockResolvedValue({ id: "run_test_1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    runLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ── Import module-handlers after mocks are in place ───────────────────────────

import { getHandler } from "~/server/core/module-handlers";
import { getCampaignInsights } from "~/integrations/facebook/graph-client";
import { appendRows } from "~/integrations/google/sheets-client";

// ── Helper to build a minimal ScenarioStep ────────────────────────────────────

function makeStep(
  position: number,
  moduleType: string,
  config: Record<string, unknown> = {},
) {
  return {
    id: `step_${position}`,
    scenarioId: "scn_test",
    position,
    moduleType,
    // Cast via unknown — Prisma's JsonValue is structurally identical at runtime
    config: config as unknown as JsonValue,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe("RunContext", () => {
  it("getUpstreamRows returns rows from the most recent prior position with data", () => {
    const ctx = new RunContext();
    ctx.setOutput(1, [{ a: 1 }]);
    ctx.setOutput(2, [{ b: 2 }, { b: 3 }]);
    // Position 3 should see the rows from position 2
    expect(ctx.getUpstreamRows(3)).toEqual([{ b: 2 }, { b: 3 }]);
  });

  it("getUpstreamRows returns [] when no upstream data exists", () => {
    const ctx = new RunContext();
    expect(ctx.getUpstreamRows(1)).toEqual([]);
  });

  it("getUpstreamRows skips positions with empty rows and returns the most recent non-empty one", () => {
    const ctx = new RunContext();
    ctx.setOutput(1, [{ a: 1 }]);
    ctx.setOutput(2, []); // empty — should be skipped
    // Position 3 should fall back to position 1
    expect(ctx.getUpstreamRows(3)).toEqual([{ a: 1 }]);
  });
});

describe("trigger.manual handler", () => {
  it("is a no-op that returns rowCount=0", async () => {
    const handler = getHandler("trigger.manual");
    const ctx = new RunContext();
    const result = await handler(makeStep(1, "trigger.manual"), ctx, "user_1");
    expect(result).toEqual({ rowCount: 0 });
  });
});

describe("fb.campaign_insights handler", () => {
  beforeEach(() => {
    vi.mocked(getCampaignInsights).mockResolvedValue([
      { campaign_id: "c1", impressions: 100 },
      { campaign_id: "c2", impressions: 200 },
    ]);
  });

  it("calls getCampaignInsights and stores rows in context", async () => {
    const handler = getHandler("fb.campaign_insights");
    const ctx = new RunContext();
    const step = makeStep(2, "fb.campaign_insights", {
      fbAccountId: "act_123",
      metrics: ["impressions"],
      dateWindowDays: 7,
    });

    const result = await handler(step, ctx, "user_1");

    expect(getCampaignInsights).toHaveBeenCalledWith("user_1", {
      fbAccountId: "act_123",
      level: "campaign",
      metrics: ["impressions"],
      dateWindowDays: 7,
    });
    expect(result.rowCount).toBe(2);
    expect(ctx.getOutput(2)).toHaveLength(2);
  });
});

describe("sheets.append handler", () => {
  it("returns rowCount=0 when no upstream data exists", async () => {
    const handler = getHandler("sheets.append");
    const ctx = new RunContext();
    const step = makeStep(1, "sheets.append", {
      spreadsheetId: "sheet_abc",
      tabName: "Data",
    });

    const result = await handler(step, ctx, "user_1");

    expect(appendRows).not.toHaveBeenCalled();
    expect(result.rowCount).toBe(0);
    expect(result.sheetsUrl).toBe("https://docs.google.com/spreadsheets/d/sheet_abc");
  });

  it("writes empty cells when sheets step is at pos 2 before fb step at pos 3", async () => {
    // Scenario: sheets at position 2, fb at position 3 (no upstream data for sheets)
    const ctx = new RunContext();
    // fb step runs AFTER sheets step — so at position 2, ctx has no outputs yet
    const sheetsHandler = getHandler("sheets.append");
    const step = makeStep(2, "sheets.append", {
      spreadsheetId: "sheet_xyz",
      tabName: "Output",
    });

    const result = await sheetsHandler(step, ctx, "user_1");
    // No upstream data before position 2
    expect(result.rowCount).toBe(0);
    expect(appendRows).not.toHaveBeenCalled();
  });
});
