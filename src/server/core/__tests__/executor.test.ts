import type { ScenarioStep } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildRerunSeedOutputs,
  buildStepCompleteLogMeta,
  resolveStepConfig,
} from "../executor";

function makeStep(): ScenarioStep {
  return {
    id: "step_1",
    scenarioId: "scenario_1",
    position: 2,
    moduleType: "test.module",
    config: {},
  };
}

describe("buildStepCompleteLogMeta", () => {
  it("includes the first three sample rows and output schema", () => {
    const meta = buildStepCompleteLogMeta(
      makeStep(),
      {
        rowCount: 4,
        rows: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }],
      },
      123,
    );

    expect(meta).toEqual({
      stepId: "step_1",
      position: 2,
      durationMs: 123,
      rowCount: 4,
      sampleRows: [{ a: 1 }, { a: 2 }, { a: 3 }],
      outputSchema: ["a"],
    });
  });
});

describe("buildRerunSeedOutputs", () => {
  it("returns sample rows from completed prior steps only", () => {
    const outputs = buildRerunSeedOutputs(
      [
        { meta: { position: 1, sampleRows: [{ a: 1 }] } },
        { meta: { position: 2, sampleRows: [{ b: 2 }] } },
        { meta: { position: 3, sampleRows: [{ c: 3 }] } },
      ],
      3,
    );

    expect(outputs).toEqual([
      [1, [{ a: 1 }]],
      [2, [{ b: 2 }]],
    ]);
  });
});

describe("resolveStepConfig", () => {
  it("interpolates top-level and one-level nested string fields", () => {
    expect(
      resolveStepConfig(
        {
          title: "Lead from {{Name}}",
          nested: { comments: "Row {{row}}", count: 1 },
          mappedFields: ["{{Name}}"],
        },
        { Name: "Alice", row: 2 },
      ),
    ).toEqual({
      title: "Lead from Alice",
      nested: { comments: "Row 2", count: 1 },
      mappedFields: ["{{Name}}"],
    });
  });
});
