import { beforeEach, describe, expect, it, vi } from "vitest";

const userSettingsFindUniqueMock = vi.hoisted(() => vi.fn());
const notificationLogCreateMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/db", () => ({
  db: {
    userSettings: {
      findUnique: userSettingsFindUniqueMock,
    },
    notificationLog: {
      create: notificationLogCreateMock,
    },
  },
}));

import { isInQuietHours, notifyOnFailure } from "../notifier";

const fetchMock = vi.fn();

const failedRunContext = {
  userId: "user_1",
  runId: "run_1",
  scenarioId: "scenario_1",
  scenarioName: "Daily sync",
  errorMessage: "Sheets quota exceeded",
  durationMs: 1234,
};

function getFetchBody(callIndex: number): unknown {
  const init = fetchMock.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  const body = init?.body;
  if (typeof body !== "string") return body;

  const parsed: unknown = JSON.parse(body);
  return parsed;
}

describe("isInQuietHours", () => {
  it("returns true inside a same-day quiet-hours window", () => {
    const now = new Date("2026-05-21T12:30:00");

    expect(isInQuietHours("12:00", "13:00", now)).toBe(true);
  });

  it("returns false outside a same-day quiet-hours window", () => {
    const now = new Date("2026-05-21T14:30:00");

    expect(isInQuietHours("12:00", "13:00", now)).toBe(false);
  });

  it("handles overnight quiet-hours windows", () => {
    const lateNight = new Date("2026-05-21T23:30:00");
    const earlyMorning = new Date("2026-05-21T05:30:00");
    const afternoon = new Date("2026-05-21T14:30:00");

    expect(isInQuietHours("22:00", "06:00", lateNight)).toBe(true);
    expect(isInQuietHours("22:00", "06:00", earlyMorning)).toBe(true);
    expect(isInQuietHours("22:00", "06:00", afternoon)).toBe(false);
  });

  it("returns false when either quiet-hours bound is null", () => {
    const now = new Date("2026-05-21T12:30:00");

    expect(isInQuietHours(null, "13:00", now)).toBe(false);
    expect(isInQuietHours("12:00", null, now)).toBe(false);
  });
});

describe("notifyOnFailure", () => {
  beforeEach(() => {
    userSettingsFindUniqueMock.mockReset();
    notificationLogCreateMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("posts to the generic webhook when set", async () => {
    userSettingsFindUniqueMock.mockResolvedValue({
      genericWebhookUrl: "https://example.test/generic",
      quietHoursStart: null,
      quietHoursEnd: null,
    });

    await notifyOnFailure(failedRunContext);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/generic",
      expect.objectContaining({ method: "POST" }),
    );
    expect(getFetchBody(0)).toEqual(failedRunContext);
  });

  it("does not post when no webhook is set", async () => {
    userSettingsFindUniqueMock.mockResolvedValue({
      genericWebhookUrl: null,
      quietHoursStart: null,
      quietHoursEnd: null,
    });

    await notifyOnFailure(failedRunContext);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(notificationLogCreateMock).not.toHaveBeenCalled();
  });
});
