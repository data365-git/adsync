import { z } from "zod";
import type { RunStatus } from "@prisma/client";

import { createTRPCRouter, authedProcedure } from "../trpc";
import { db } from "~/server/db";

type FolderCrumb = {
  id: string;
  name: string;
  parentId: string | null;
};

function termsFor(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean);
}

function pathFor(
  folderId: string | null | undefined,
  foldersById: Map<string, FolderCrumb>,
): string {
  if (!folderId) return "";

  const names: string[] = [];
  const seen = new Set<string>();
  let current: string | null | undefined = folderId;

  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = foldersById.get(current);
    if (!folder) break;
    names.unshift(folder.name);
    current = folder.parentId;
  }

  return names.join(" / ");
}

function parentPathFor(
  parentId: string | null | undefined,
  foldersById: Map<string, FolderCrumb>,
): string {
  return pathFor(parentId, foldersById);
}

export const searchRouter = createTRPCRouter({
  global: authedProcedure
    .input(z.object({ q: z.string() }))
    .query(async ({ input, ctx }) => {
      const q = input.q.trim();
      if (!q) return { scenarios: [], folders: [], adAccounts: [], recentRuns: [] };

      const userId = ctx.userId;
      const terms = termsFor(q);
      const runStatuses = new Set<RunStatus>([
        "QUEUED",
        "RUNNING",
        "SUCCESS",
        "FAILED",
      ]);

      const [folderRows, scenarios, folders, adAccounts, recentRuns] =
        await Promise.all([
          db.folder.findMany({
            where: { userId },
            select: { id: true, name: true, parentId: true },
          }),
          db.scenario.findMany({
            where: {
              userId,
              AND: terms.map((term) => ({
                OR: [{ name: { contains: term, mode: "insensitive" } }],
              })),
            },
            select: { id: true, name: true, folderId: true },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
          db.folder.findMany({
            where: {
              userId,
              AND: terms.map((term) => ({
                OR: [{ name: { contains: term, mode: "insensitive" } }],
              })),
            },
            select: { id: true, name: true, parentId: true },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
          db.adAccount.findMany({
            where: {
              userId,
              AND: terms.map((term) => ({
                OR: [
                  { label: { contains: term, mode: "insensitive" } },
                  { fbAccountId: { contains: term, mode: "insensitive" } },
                ],
              })),
            },
            select: { id: true, label: true, fbAccountId: true },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
          db.run.findMany({
            where: {
              userId,
              AND: terms.map((term) => {
                const status = term.toUpperCase() as RunStatus;
                return {
                  OR: [
                    ...(runStatuses.has(status) ? [{ status }] : []),
                    {
                      scenario: {
                        name: { contains: term, mode: "insensitive" },
                      },
                    },
                  ],
                };
              }),
            },
            select: {
              id: true,
              status: true,
              startedAt: true,
              scenario: { select: { name: true } },
            },
            orderBy: { startedAt: "desc" },
            take: 10,
          }),
        ]);

      const foldersById = new Map(folderRows.map((folder) => [folder.id, folder]));

      return {
        scenarios: scenarios.slice(0, 10).map((scenario) => ({
          id: scenario.id,
          name: scenario.name,
          description: "",
          folderPath: pathFor(scenario.folderId, foldersById),
        })),
        folders: folders.slice(0, 10).map((folder) => ({
          id: folder.id,
          name: folder.name,
          parentPath: parentPathFor(folder.parentId, foldersById),
        })),
        adAccounts: adAccounts.slice(0, 10).map((account) => ({
          id: account.id,
          name: account.label,
          accountId: account.fbAccountId,
        })),
        recentRuns: recentRuns.slice(0, 10).map((run) => ({
          id: run.id,
          scenarioName: run.scenario.name,
          status: run.status,
          createdAt: run.startedAt,
        })),
      };
    }),
});
