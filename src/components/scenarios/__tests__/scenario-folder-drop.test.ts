import { describe, expect, it } from "vitest";

type Scenario = { id: string; name: string; folderId?: string | null };

function resolveDrop({
  scenarioId,
  targetFolderId,
  scenarios,
}: {
  scenarioId: string;
  targetFolderId: string | null;
  scenarios: Scenario[];
}) {
  const scenario = scenarios.find((item) => item.id === scenarioId);

  if (!scenario) return { status: "missing" as const };

  if ((scenario.folderId ?? null) === targetFolderId) {
    return { status: "same-folder" as const, name: scenario.name };
  }

  return {
    status: "move" as const,
    scenarioId,
    folderId: targetFolderId,
    name: scenario.name,
  };
}

const scenarios = [
  { id: "scenario_1", name: "Daily Insights", folderId: "folder_a" },
  { id: "scenario_2", name: "Root Sync", folderId: null },
];

describe("scenario folder drop logic", () => {
  it("returns move data for a scenario dropped onto a different folder", () => {
    expect(
      resolveDrop({
        scenarioId: "scenario_1",
        targetFolderId: "folder_b",
        scenarios,
      }),
    ).toEqual({
      status: "move",
      scenarioId: "scenario_1",
      folderId: "folder_b",
      name: "Daily Insights",
    });
  });

  it("returns same-folder for a no-op drop", () => {
    expect(
      resolveDrop({
        scenarioId: "scenario_1",
        targetFolderId: "folder_a",
        scenarios,
      }),
    ).toEqual({ status: "same-folder", name: "Daily Insights" });
  });
});
