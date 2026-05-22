"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  parentName: string | null;
  onCreated: (id: string) => void;
};

export function CreateFolderDialog({
  open,
  onOpenChange,
  parentId,
  parentName,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const utils = api.useUtils();

  const createMutation = api.folders.create.useMutation({
    onSuccess(folder) {
      toast.success(`Folder "${folder.name}" created`);
      void utils.folders.list.invalidate();
      void utils.folders.tree.invalidate();
      onCreated(folder.id);
      setName("");
      onOpenChange(false);
    },
    onError(err) {
      toast.error(err.message ?? "Failed to create folder. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed, parentId });
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setName("");
      createMutation.reset();
    }
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <p className="text-sm text-slate-500">
            Inside{" "}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
              {parentName ?? "Home"}
            </span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Campaigns"
              autoFocus
              maxLength={100}
              aria-describedby="folder-name-hint"
            />
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  type="button"
                  disabled={createMutation.isPending}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
              ) : null}
              Create folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
