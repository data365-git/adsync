import { beforeEach, describe, expect, it, vi } from "vitest";

const folderFindManyMock = vi.hoisted(() => vi.fn());
const scenarioFindManyMock = vi.hoisted(() => vi.fn());
const runFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user_1" },
  })),
}));

vi.mock("~/server/db", () => ({
  db: {
    folder: { findMany: folderFindManyMock },
    scenario: { findMany: scenarioFindManyMock },
    run: { findMany: runFindManyMock },
  },
}));

async function createSearchCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { searchRouter } = await import("../search");
  return createCallerFactory(searchRouter)({ headers: new Headers() });
}

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `id_${index}`,
    name: `Result ${index}`,
    folderId: null,
    parentId: null,
    status: "SUCCESS",
    startedAt: new Date("2026-05-21T00:00:00.000Z"),
    scenario: { name: `Scenario ${index}` },
  }));
}

describe("search.global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    folderFindManyMock.mockResolvedValue([]);
    scenarioFindManyMock.mockResolvedValue([]);
    runFindManyMock.mockResolvedValue([]);
  });

  it("returns empty arrays for empty q", async () => {
    const caller = await createSearchCaller();

    await expect(caller.global({ q: "   " })).resolves.toEqual({
      scenarios: [],
      folders: [],
      recentRuns: [],
    });
    expect(scenarioFindManyMock).not.toHaveBeenCalled();
    expect(folderFindManyMock).not.toHaveBeenCalled();
    expect(runFindManyMock).not.toHaveBeenCalled();
  });

  it("returns max 10 per section", async () => {
    folderFindManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(rows(11));
    scenarioFindManyMock.mockResolvedValue(rows(11));
    runFindManyMock.mockResolvedValue(rows(11));

    const caller = await createSearchCaller();
    const result = await caller.global({ q: "result" });

    expect(result.scenarios).toHaveLength(10);
    expect(result.folders).toHaveLength(10);
    expect(result.recentRuns).toHaveLength(10);
    expect(scenarioFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
    expect(runFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});
