"use client";

import { useState } from "react";
import { Folder, Loader2, MoreHorizontal, Pencil, Trash2, FolderInput } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { api } from "~/trpc/react";
import { highlight } from "~/lib/highlight";
import { MoveToFolderDialog } from "./MoveToFolderDialog";

type FolderData = {
  id: string;
  name: string;
  parentId: string | null;
  _count: { scenarios: number };
};

type Props = {
  folder: FolderData;
  onScenarioDrop: (scenarioId: string, folderId: string | null) => void;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onNavigate: (id: string) => void;
  onDeleted: (id: string) => void;
  onRenamed: () => void;
  onMoved: () => void;
  searchQuery?: string;
};

export function FolderRow({
  folder,
  onScenarioDrop,
  selected,
  onSelectedChange,
  onNavigate,
  onDeleted,
  onRenamed,
  onMoved,
  searchQuery,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cascadeScenarios, setCascadeScenarios] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [moveOpen, setMoveOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const utils = api.useUtils();

  const renameMutation = api.folders.rename.useMutation({
    onSuccess() {
      toast.success("Folder renamed");
      void utils.folders.list.invalidate();
      void utils.folders.tree.invalidate();
      void utils.folders.breadcrumb.invalidate();
      setRenaming(false);
      onRenamed();
    },
    onError(err) {
      toast.error(err.message ?? "Failed to rename folder.");
      setRenaming(false);
    },
  });

  const deleteMutation = api.folders.delete.useMutation({
    onSuccess() {
      toast.success(`"${folder.name}" deleted`);
      void utils.folders.list.invalidate();
      void utils.folders.tree.invalidate();
      void utils.scenarios.list.invalidate();
      setDeleteOpen(false);
      onDeleted(folder.id);
    },
    onError(err) {
      toast.error(err.message ?? "Failed to delete folder.");
    },
  });

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = renameName.trim();
    if (!trimmed || trimmed === folder.name) {
      setRenaming(false);
      return;
    }
    renameMutation.mutate({ id: folder.id, name: trimmed });
  }

  function handleRowClick() {
    onNavigate(folder.id);
  }

  return (
    <>
      <tr
        className={`h-[52px] cursor-pointer border-b focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none focus-visible:ring-inset ${
          isDragOver
            ? "border-sky-200 bg-sky-50"
            : "border-slate-100 hover:bg-slate-50"
        }`}
        tabIndex={0}
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes("text/scenario-id")) {
            setIsDragOver(true);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("text/scenario-id")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const id = e.dataTransfer.getData("text/scenario-id");
          if (id) onScenarioDrop(id, folder.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onNavigate(folder.id);
        }}
        onClick={handleRowClick}
        aria-label={`Open folder ${folder.name}`}
      >
        {/* Checkbox */}
        <td className="w-10 px-4 py-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Select folder ${folder.name}`}
          />
        </td>

        {/* Name */}
        <td className="max-w-[280px] min-w-[180px] py-3 pr-4 pl-5">
          <div className="flex items-center gap-2">
            <Folder className="size-4 shrink-0 text-slate-500" aria-hidden />
            {renaming ? (
              <form
                onSubmit={handleRenameSubmit}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onBlur={() => setRenaming(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setRenaming(false);
                      setRenameName(folder.name);
                    }
                    e.stopPropagation();
                  }}
                  autoFocus
                  className="rounded border border-sky-500 px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  maxLength={100}
                />
              </form>
            ) : (
              <span
                className="text-base text-slate-900"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenaming(true);
                }}
              >
                {searchQuery?.trim()
                  ? highlight(folder.name, searchQuery)
                  : folder.name}
              </span>
            )}
            <span className="ml-1 font-mono text-xs text-slate-400">
              ({folder._count.scenarios})
            </span>
          </div>
        </td>

        {/* Kind — folder placeholder */}
        <td className="min-w-[100px] px-4 py-3">
          <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-slate-500">
            Folder
          </span>
        </td>

        {/* Enabled — N/A */}
        <td className="px-4 py-3">
          <span className="text-slate-300">—</span>
        </td>

        {/* Last Run — N/A */}
        <td className="min-w-[140px] px-4 py-3">
          <span className="text-slate-300">—</span>
        </td>

        {/* Actions */}
        <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring aria-expanded:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`Folder options for ${folder.name}`}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setRenaming(true);
                  setRenameName(folder.name);
                }}
              >
                <Pencil className="size-4" aria-hidden />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveOpen(true);
                }}
              >
                <FolderInput className="size-4" aria-hidden />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setCascadeScenarios(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{folder.name}&rdquo;? This will also delete all
              subfolders.
              {folder._count.scenarios > 0 && (
                <>
                  {" "}
                  This folder contains{" "}
                  <strong>
                    {folder._count.scenarios} scenario
                    {folder._count.scenarios === 1 ? "" : "s"}
                  </strong>
                  .
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {folder._count.scenarios > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <input
                id="cascade-scenarios"
                type="checkbox"
                checked={cascadeScenarios}
                onChange={(e) => setCascadeScenarios(e.target.checked)}
                className="size-4 rounded accent-red-600"
              />
              <label
                htmlFor="cascade-scenarios"
                className="cursor-pointer text-sm text-amber-800"
              >
                Also delete the {folder._count.scenarios} scenario
                {folder._count.scenarios === 1 ? "" : "s"} inside
                <span className="ml-1 text-xs text-amber-600">
                  (off = move them to root)
                </span>
              </label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({ id: folder.id, cascadeScenarios })
              }
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to folder dialog */}
      <MoveToFolderDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        folderId={folder.id}
        currentParentId={folder.parentId}
        onMoved={onMoved}
      />
    </>
  );
}
