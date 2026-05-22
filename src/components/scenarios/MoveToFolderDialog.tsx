"use client";

import { useState } from "react";
import { ChevronRight, Folder, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import type { FolderNode } from "~/server/api/routers/folders";
import { cn } from "~/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** IDs of scenarios to move */
  scenarioIds?: string[];
  /** ID of a folder to move */
  folderId?: string;
  /** Current parent — disabled in picker */
  currentParentId: string | null;
  onMoved: () => void;
};

export function MoveToFolderDialog({
  open,
  onOpenChange,
  scenarioIds,
  folderId,
  currentParentId,
  onMoved,
}: Props) {
  const [selected, setSelected] = useState<string | null | undefined>(
    undefined,
  );
  const [q, setQ] = useState("");
  const utils = api.useUtils();

  const treeQuery = api.folders.tree.useQuery(undefined, { enabled: open });

  const moveScenariosMutation = api.scenarios.move.useMutation({
    onSuccess() {
      const dest = selected === null ? "root" : "folder";
      toast.success(
        `${scenarioIds?.length === 1 ? "Scenario" : "Scenarios"} moved to ${dest}`,
      );
      void utils.scenarios.list.invalidate();
      void utils.folders.list.invalidate();
      void utils.folders.tree.invalidate();
      handleClose();
      onMoved();
    },
    onError(err) {
      toast.error(err.message ?? "Failed to move. Please try again.");
    },
  });

  const moveFolderMutation = api.folders.move.useMutation({
    onSuccess() {
      toast.success("Folder moved");
      void utils.folders.list.invalidate();
      void utils.folders.tree.invalidate();
      void utils.folders.breadcrumb.invalidate();
      handleClose();
      onMoved();
    },
    onError(err) {
      toast.error(err.message ?? "Failed to move. Please try again.");
    },
  });

  const isPending =
    moveScenariosMutation.isPending || moveFolderMutation.isPending;

  function handleClose() {
    setSelected(undefined);
    setQ("");
    onOpenChange(false);
  }

  function handleMove() {
    if (selected === undefined) return;

    if (folderId) {
      moveFolderMutation.mutate({ id: folderId, newParentId: selected });
    } else if (scenarioIds && scenarioIds.length > 0) {
      moveScenariosMutation.mutate({ ids: scenarioIds, folderId: selected });
    }
  }

  // Flatten tree for search
  const allNodes = flattenTree(treeQuery.data ?? []);
  const filtered =
    q.trim()
      ? allNodes.filter((n) =>
          n.name.toLowerCase().includes(q.trim().toLowerCase()),
        )
      : null;

  const label = folderId
    ? "Move folder to"
    : `Move ${scenarioIds?.length === 1 ? "scenario" : `${scenarioIds?.length ?? 0} scenarios`} to`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search folders…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search folders"
          />

          <div
            className="max-h-64 overflow-y-auto rounded-lg border border-slate-200"
            role="listbox"
            aria-label="Select destination folder"
          >
            {/* Move to root */}
            <FolderOption
              id={null}
              name="Home (root)"
              depth={0}
              icon={<Home className="size-4 text-slate-500" aria-hidden />}
              selected={selected === null}
              disabled={currentParentId === null}
              onClick={() => setSelected(null)}
            />

            {/* Filtered or tree */}
            {filtered !== null ? (
              filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-500">
                  No folders found
                </p>
              ) : (
                filtered.map((node) => (
                  <FolderOption
                    key={node.id}
                    id={node.id}
                    name={node.name}
                    depth={0}
                    selected={selected === node.id}
                    disabled={
                      node.id === folderId ||
                      node.id === currentParentId ||
                      isDescendantOf(node, folderId, treeQuery.data ?? [])
                    }
                    onClick={() => setSelected(node.id)}
                  />
                ))
              )
            ) : (
              (treeQuery.data ?? []).map((node) => (
                <FolderTreeRow
                  key={node.id}
                  node={node}
                  depth={1}
                  selected={selected}
                  onSelect={setSelected}
                  excludeId={folderId}
                  currentParentId={currentParentId}
                  tree={treeQuery.data ?? []}
                />
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                type="button"
                disabled={isPending}
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            onClick={handleMove}
            disabled={selected === undefined || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            ) : null}
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderOption({
  id: _id,
  name,
  depth,
  icon,
  selected,
  disabled,
  onClick,
}: {
  id: string | null;
  name: string;
  depth: number;
  icon?: React.ReactNode;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none",
        selected && "bg-sky-50 text-sky-700",
        !selected && !disabled && "hover:bg-slate-50 cursor-pointer",
        disabled && "cursor-not-allowed opacity-40",
      )}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      {icon ?? <Folder className="size-4 text-slate-500" aria-hidden />}
      <span className="truncate">{name}</span>
    </button>
  );
}

function FolderTreeRow({
  node,
  depth,
  selected,
  onSelect,
  excludeId,
  currentParentId,
  tree,
}: {
  node: FolderNode;
  depth: number;
  selected: string | null | undefined;
  onSelect: (id: string | null) => void;
  excludeId?: string;
  currentParentId: string | null;
  tree: FolderNode[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isDisabled =
    node.id === excludeId ||
    node.id === currentParentId ||
    isDescendantOf(node, excludeId, tree);

  return (
    <>
      <div className="flex items-center">
        {node.children.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="pl-2 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
            aria-label={expanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-90",
              )}
              aria-hidden
            />
          </button>
        )}
        <FolderOption
          id={node.id}
          name={node.name}
          depth={node.children.length > 0 ? depth - 1 : depth}
          selected={selected === node.id}
          disabled={isDisabled}
          onClick={() => onSelect(node.id)}
        />
      </div>
      {expanded &&
        node.children.map((child) => (
          <FolderTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
            excludeId={excludeId}
            currentParentId={currentParentId}
            tree={tree}
          />
        ))}
    </>
  );
}

type FlatNode = { id: string; name: string };

function flattenTree(nodes: FolderNode[]): FlatNode[] {
  const result: FlatNode[] = [];
  function walk(n: FolderNode) {
    result.push({ id: n.id, name: n.name });
    for (const c of n.children) walk(c);
  }
  for (const n of nodes) walk(n);
  return result;
}

function isDescendantOf(
  node: FlatNode,
  ancestorId: string | undefined,
  tree: FolderNode[],
): boolean {
  if (!ancestorId) return false;

  // Find the ancestor node and check if `node.id` is in its subtree
  function findAndCheck(nodes: FolderNode[]): boolean {
    for (const n of nodes) {
      if (n.id === ancestorId) {
        const desc = flattenTree(n.children);
        return desc.some((d) => d.id === node.id);
      }
      if (findAndCheck(n.children)) return true;
    }
    return false;
  }

  return findAndCheck(tree);
}
