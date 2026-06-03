import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type CreatedStep = { position: number; moduleType: string; config: unknown };

const state = vi.hoisted(() => ({
  scenarios: [] as Array<{ userId: string }>,
  createCalls: [] as Array<{ data: Record<string, unknown> }>,
}));

vi.mock("~/server/db", () => ({
  db: {
    scenario: {
      count: vi.fn(
        async ({ where }: { where: { userId: string } }) =>
          state.scenarios.filter((s) => s.userId === where.userId).length,
      ),
      create: vi.fn(async ({ data }: { data: { userId: string } }) => {
        state.createCalls.push({ data });
        state.scenarios.push({ userId: data.userId });
        return { id: `scn_${state.createCalls.length}`, ...data };
      }),
    },
  },
}));

beforeEach(() => {
  state.scenarios = [];
  state.createCalls = [];
  vi.clearAllMocks();
});

describe("seedDefaultScenarios", () => {
  it("is idempotent: calling twice for the same user creates only one scenario", async () => {
    const { seedDefaultScenarios } = await import("../onboarding");
    await seedDefaultScenarios("user_1");
    await seedDefaultScenarios("user_1");
    expect(state.createCalls).toHaveLength(1);
  });

  it("does nothing when the user already has a scenario", async () => {
    state.scenarios.push({ userId: "user_1" });
    const { seedDefaultScenarios } = await import("../onboarding");
    await seedDefaultScenarios("user_1");
    expect(state.createCalls).toHaveLength(0);
  });

  it("creates one disabled scenario with exactly 3 steps in order", async () => {
    const { seedDefaultScenarios } = await import("../onboarding");
    await seedDefaultScenarios("user_1");

    expect(state.createCalls).toHaveLength(1);
    const data = state.createCalls[0]!.data as {
      name: string;
      enabled: boolean;
      steps: { create: CreatedStep[] };
    };
    expect(data.enabled).toBe(false);
    expect(data.name).toBe("Daily Google Sheets → Bitrix24 (setup needed)");

    const steps = data.steps.create;
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => [s.position, s.moduleType])).toEqual([
      [1, "trigger.schedule"],
      [2, "sheets.get_all_rows"],
      [3, "bitrix.create_lead"],
    ]);
  });
});
