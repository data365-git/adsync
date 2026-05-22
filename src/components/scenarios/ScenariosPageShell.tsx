"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, FolderPlus, Plus, Zap } from "lucide-react";
import { useQueryState, parseAsString } from "nuqs";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScenariosClient } from "./ScenariosClient";

export function ScenariosPageShell() {
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderParam] = useQueryState("folder", parseAsString.withDefault(""));
  const currentFolderId = folderParam || null;

  const newHref = currentFolderId
    ? `/scenarios/new?folder=${currentFolderId}`
    : "/scenarios/new";

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-medium tracking-tight">Scenarios</h1>
          <p className="text-base text-slate-500">
            Build and manage automation flows.
          </p>
        </div>

        {/* Split "+ New ▾" button */}
        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-800 shadow-sm">
          <Button
            render={<Link href={newHref} />}
            className="rounded-none rounded-l-lg border-r border-slate-700"
            size="default"
          >
            <Plus className="size-4" aria-hidden />
            New scenario
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 items-center justify-center rounded-r-lg bg-slate-900 px-2 text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none"
              aria-label="More new options"
            >
              <ChevronDown className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={newHref} />}>
                <Zap className="size-4" aria-hidden />
                New scenario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus className="size-4" aria-hidden />
                New folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scenarios list — manages its own folder dialog state,
          but we can signal it to open via externalCreateFolderOpen */}
      <ScenariosClient
        externalCreateFolderOpen={createFolderOpen}
        onExternalCreateFolderClose={() => setCreateFolderOpen(false)}
      />
    </div>
  );
}
