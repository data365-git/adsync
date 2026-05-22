import { describe, expect, it } from "vitest";

import { nextFireAt } from "~/lib/cron-builder";

describe("nextFireAt", () => {
  it("returns the next daily 06:00 UTC after from", () => {
    const result = nextFireAt(
      "0 6 * * *",
      "UTC",
      new Date("2026-01-01T05:30:00.000Z"),
    );

    expect(result?.toISOString()).toBe("2026-01-01T06:00:00.000Z");
  });

  it("returns the next minute for every-minute cron", () => {
    const result = nextFireAt(
      "* * * * *",
      "UTC",
      new Date("2026-01-01T00:07:00.000Z"),
    );

    expect(result?.toISOString()).toBe("2026-01-01T00:08:00.000Z");
  });

  it("returns the next quarter-hour boundary for step cron", () => {
    const result = nextFireAt(
      "*/15 * * * *",
      "UTC",
      new Date("2026-01-01T00:07:00.000Z"),
    );

    expect(result?.toISOString()).toBe("2026-01-01T00:15:00.000Z");
  });

  it("returns the next four-hour boundary at minute zero", () => {
    const result = nextFireAt(
      "0 */4 * * *",
      "UTC",
      new Date("2026-01-01T02:30:00.000Z"),
    );

    expect(result).not.toBeNull();
    expect(result?.toISOString()).toBe("2026-01-01T04:00:00.000Z");
    expect(result!.getUTCHours() % 4).toBe(0);
    expect(result?.getUTCMinutes()).toBe(0);
  });
});
