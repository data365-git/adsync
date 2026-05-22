import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "~/server/db";
import { authedProcedure, createTRPCRouter } from "~/server/api/trpc";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FolderNode = {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { scenarios: number };
  children: FolderNode[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns all descendant IDs of a given folder, including itself.
 * Used to detect cycles when moving a folder.
 */
async function getDescendantIds(
  folderId: string,
  userId: string,
): Promise<Set<string>> {
  const result = new Set<string>([folderId]);
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await db.folder.findMany({
      where: { parentId: current, userId },
      select: { id: true },
    });
    for (const child of children) {
      result.add(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

/**
 * Builds a nested folder tree from a flat list.
 */
function buildTree(
  flat: Array<{
    id: string;
    name: string;
    parentId: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    _count: { scenarios: number };
  }>,
): FolderNode[] {
  const map = new Map<string, FolderNode>();
  for (const f of flat) {
    map.set(f.id, { ...f, children: [] });
  }

  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphaned node — treat as root
        roots.push(node);
      }
    }
  }

  return roots;
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// ── Router ────────────────────────────────────────────────────────────────────

export const foldersRouter = createTRPCRouter({
  /**
   * List immediate children of a given parent (or root when parentId is null).
   * Includes scenario count per folder.
   */
  list: authedProcedure
    .input(
      z.object({
        parentId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      // parentId: undefined = root (null), explicit null = root, explicit string = folder
      const parentId = input.parentId === undefined ? null : input.parentId;

      return db.folder.findMany({
        where: { userId, parentId },
        include: { _count: { select: { scenarios: true } } },
        orderBy: { name: "asc" },
      });
    }),

  /**
   * Full folder tree for Move-to dialog and future Cmd+K.
   */
  tree: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const flat = await db.folder.findMany({
      where: { userId },
      include: { _count: { select: { scenarios: true } } },
      orderBy: { name: "asc" },
    });
    return buildTree(flat);
  }),

  /**
   * Get breadcrumb path for a folder (root → ... → current).
   */
  breadcrumb: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const crumbs: Array<{ id: string; name: string }> = [];
      let current: string | null = input.id;

      while (current !== null) {
        const nodeId: string = current;
        const node = await db.folder.findUnique({
          where: { id: nodeId },
          select: { id: true, name: true, parentId: true, userId: true },
        });
        if (node?.userId !== userId) break;
        crumbs.unshift({ id: node.id, name: node.name });
        current = node.parentId;
      }

      return crumbs;
    }),

  /**
   * Create a new folder under the given parent (or at root).
   */
  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).trim(),
        parentId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const parentId = input.parentId ?? null;

      // Verify parent belongs to this user if specified
      if (parentId !== null) {
        const parent = await db.folder.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });
        if (parent?.userId !== userId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Parent folder not found" });
        }
      }

      try {
        return await db.folder.create({
          data: { name: input.name, parentId, userId },
          include: { _count: { select: { scenarios: true } } },
        });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A folder named "${input.name}" already exists here. Use a different name.`,
          });
        }
        throw err;
      }
    }),

  /**
   * Rename a folder.
   */
  rename: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).trim(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const existing = await db.folder.findUnique({
        where: { id: input.id },
        select: { userId: true, parentId: true },
      });
      if (existing?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      try {
        return await db.folder.update({
          where: { id: input.id },
          data: { name: input.name },
          include: { _count: { select: { scenarios: true } } },
        });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A folder named "${input.name}" already exists here. Use a different name.`,
          });
        }
        throw err;
      }
    }),

  /**
   * Move a folder to a new parent (or to root with newParentId=null).
   * Rejects cycles (moving into itself or a descendant).
   */
  move: authedProcedure
    .input(
      z.object({
        id: z.string(),
        newParentId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const folder = await db.folder.findUnique({
        where: { id: input.id },
        select: { userId: true, parentId: true },
      });
      if (folder?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      // Cycle detection: new parent must not be self or any descendant
      if (input.newParentId !== null) {
        const parent = await db.folder.findUnique({
          where: { id: input.newParentId },
          select: { userId: true },
        });
        if (parent?.userId !== userId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Parent folder not found" });
        }

        const descendants = await getDescendantIds(input.id, userId);
        if (descendants.has(input.newParentId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot move a folder into itself or one of its subfolders.",
          });
        }
      }

      try {
        return await db.folder.update({
          where: { id: input.id },
          data: { parentId: input.newParentId },
          include: { _count: { select: { scenarios: true } } },
        });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A folder with this name already exists in the destination.",
          });
        }
        throw err;
      }
    }),

  /**
   * Delete a folder.
   * When cascadeScenarios=false (default), scenarios move to root.
   * When cascadeScenarios=true, scenarios are deleted with the folder.
   * Child folders are always cascade-deleted by the DB (onDelete: Cascade).
   */
  delete: authedProcedure
    .input(
      z.object({
        id: z.string(),
        cascadeScenarios: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const folder = await db.folder.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });
      if (folder?.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (!input.cascadeScenarios) {
        // Gather all folder IDs in the subtree (the DB cascades folder deletes,
        // but scenarios have onDelete:SetNull — so we need to null out explicitly
        // for all nested folders before deleting the root).
        const subtree = await getDescendantIds(input.id, userId);
        await db.scenario.updateMany({
          where: { userId, folderId: { in: Array.from(subtree) } },
          data: { folderId: null },
        });
      }
      // If cascadeScenarios=true, the scenarios will be deleted by cascade
      // because Scenario.folderId has onDelete:SetNull not Cascade.
      // We need explicit delete in that case.
      if (input.cascadeScenarios) {
        const subtree = await getDescendantIds(input.id, userId);
        await db.scenario.deleteMany({
          where: { userId, folderId: { in: Array.from(subtree) } },
        });
      }

      await db.folder.delete({ where: { id: input.id } });
      return { success: true as const, id: input.id };
    }),
});
