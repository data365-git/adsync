import type { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const folderCreateMock = vi.hoisted(() => vi.fn());
const folderFindUniqueMock = vi.hoisted(() => vi.fn());
const folderFindManyMock = vi.hoisted(() => vi.fn());
const folderUpdateMock = vi.hoisted(() => vi.fn());
const folderDeleteMock = vi.hoisted(() => vi.fn());
const scenarioFindManyMock = vi.hoisted(() => vi.fn());
const scenarioUpdateManyMock = vi.hoisted(() => vi.fn());
const scenarioDeleteManyMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user_1" },
  })),
}));

vi.mock("~/server/db", () => ({
  db: {
    folder: {
      create: folderCreateMock,
      findUnique: folderFindUniqueMock,
      findMany: folderFindManyMock,
      update: folderUpdateMock,
      delete: folderDeleteMock,
    },
    scenario: {
      findMany: scenarioFindManyMock,
      updateMany: scenarioUpdateManyMock,
      deleteMany: scenarioDeleteManyMock,
    },
  },
}));

vi.mock("~/server/core/executor", () => ({
  buildStepCompleteLogMeta: vi.fn(),
  buildStepStartLogMeta: vi.fn(),
  executeRun: vi.fn(),
  resolveStepConfig: vi.fn(),
}));

vi.mock("~/server/core/run-context", () => ({
  RunContext: class {},
}));

vi.mock("~/server/core/module-handlers", () => ({
  getHandler: vi.fn(),
}));

async function createFoldersCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { foldersRouter } = await import("../folders");
  return createCallerFactory(foldersRouter)({ headers: new Headers() });
}

async function createScenariosCaller() {
  const { createCallerFactory } = await import("~/server/api/trpc");
  const { scenariosRouter } = await import("../scenarios");
  return createCallerFactory(scenariosRouter)({ headers: new Headers() });
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target: ["userId", "parentId", "name"] },
  });
}

describe("folders router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    folderFindManyMock.mockResolvedValue([]);
  });

  it("folders.create rejects duplicate names with CONFLICT", async () => {
    folderCreateMock.mockRejectedValue(p2002());

    const caller = await createFoldersCaller();

    await expect(
      caller.create({ name: "Q4", parentId: null }),
    ).rejects.toMatchObject({
      code: "CONFLICT" satisfies TRPCError["code"],
    });
  });

  it("folders.move rejects moving into itself or a descendant with BAD_REQUEST", async () => {
    folderFindUniqueMock.mockResolvedValue({ userId: "user_1", parentId: null });
    folderFindManyMock
      .mockResolvedValueOnce([{ id: "child_1" }])
      .mockResolvedValueOnce([]);

    const caller = await createFoldersCaller();

    await expect(
      caller.move({ id: "folder_1", newParentId: "child_1" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST" satisfies TRPCError["code"],
    });
    expect(folderUpdateMock).not.toHaveBeenCalled();
  });

  it("folders.delete with cascadeScenarios=false moves subtree scenarios to root", async () => {
    folderFindUniqueMock.mockResolvedValue({ userId: "user_1" });
    folderFindManyMock
      .mockResolvedValueOnce([{ id: "child_1" }])
      .mockResolvedValueOnce([]);
    scenarioUpdateManyMock.mockResolvedValue({ count: 2 });
    folderDeleteMock.mockResolvedValue({ id: "folder_1" });

    const caller = await createFoldersCaller();
    const result = await caller.delete({
      id: "folder_1",
      cascadeScenarios: false,
    });

    expect(result).toEqual({ success: true, id: "folder_1" });
    expect(scenarioUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1", folderId: { in: ["folder_1", "child_1"] } },
      data: { folderId: null },
    });
    expect(scenarioDeleteManyMock).not.toHaveBeenCalled();
  });

  it("folders.delete with cascadeScenarios=true deletes subtree scenarios", async () => {
    folderFindUniqueMock.mockResolvedValue({ userId: "user_1" });
    folderFindManyMock
      .mockResolvedValueOnce([{ id: "child_1" }])
      .mockResolvedValueOnce([]);
    scenarioDeleteManyMock.mockResolvedValue({ count: 2 });
    folderDeleteMock.mockResolvedValue({ id: "folder_1" });

    const caller = await createFoldersCaller();
    const result = await caller.delete({
      id: "folder_1",
      cascadeScenarios: true,
    });

    expect(result).toEqual({ success: true, id: "folder_1" });
    expect(scenarioDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user_1", folderId: { in: ["folder_1", "child_1"] } },
    });
    expect(scenarioUpdateManyMock).not.toHaveBeenCalled();
  });
});

describe("scenarios.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scenarioFindManyMock.mockResolvedValue([]);
  });

  it("scope=all searches globally and AND-matches whitespace tokens", async () => {
    const caller = await createScenariosCaller();

    await caller.list({
      folderId: "folder_1",
      q: "daily sync",
      scope: "all",
      sort: "name",
      dir: "asc",
    });

    expect(scenarioFindManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        AND: [
          { name: { contains: "daily", mode: "insensitive" } },
          { name: { contains: "sync", mode: "insensitive" } },
        ],
      },
      include: { steps: { orderBy: { position: "asc" } } },
      orderBy: { name: "asc" },
    });
  });
});
