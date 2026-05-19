import { describe, expect, it } from "vitest";

import { computeNextRuns, parseCronField } from "~/lib/cron-preview";

describe("parseCronField", () => {
  it("supports wildcards, steps, lists, and ranges", () => {
    expect(parseCronField("*", [1, 3])).toEqual([1, 2, 3]);
    expect(parseCronField("*/15", [0, 59])).toEqual([0, 15, 30, 45]);
    expect(parseCronField("1,2,3", [0, 6])).toEqual([1, 2, 3]);
    expect(parseCronField("1-3", [0, 6])).toEqual([1, 2, 3]);
  });
});

describe("computeNextRuns", () => {
  it("returns daily 06:00 UTC firings for standard cron", () => {
    const result = computeNextRuns(
      "0 6 * * *",
      "UTC",
      3,
      new Date("2026-01-01T05:30:00.000Z"),
    );

    expect(result.error).toBeUndefined();
    expect(result.next.map((date) => date.toISOString())).toEqual([
      "2026-01-01T06:00:00.000Z",
      "2026-01-02T06:00:00.000Z",
      "2026-01-03T06:00:00.000Z",
    ]);
  });

  it("returns quarter-hour firings for step cron", () => {
    const result = computeNextRuns(
      "*/15 * * * *",
      "UTC",
      3,
      new Date("2026-01-01T00:07:00.000Z"),
    );

    expect(result.error).toBeUndefined();
    expect(result.next.map((date) => date.toISOString())).toEqual([
      "2026-01-01T00:15:00.000Z",
      "2026-01-01T00:30:00.000Z",
      "2026-01-01T00:45:00.000Z",
    ]);
  });

  it("reports invalid cron syntax", () => {
    const result = computeNextRuns(
      "61 * * * *",
      "UTC",
      3,
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(result.next).toEqual([]);
    expect(result.error).toBe("Cron syntax error.");
  });

  it("reports invalid timezone", () => {
    const result = computeNextRuns(
      "0 6 * * *",
      "Not/AZone",
      3,
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(result.next).toEqual([]);
    expect(result.error).toBe("Invalid timezone.");
  });
});
