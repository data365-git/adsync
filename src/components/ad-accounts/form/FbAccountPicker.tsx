"use client";

import * as React from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";

interface FbAccount {
  id: string;
  name: string;
}

interface FbAccountPickerProps {
  accounts: FbAccount[];
  value: string;
  onChange: (id: string) => void;
  onBlur?: () => void;
  error?: string;
  loading?: boolean;
}

export function FbAccountPicker({
  accounts,
  value,
  onChange,
  onBlur,
  error,
  loading,
}: FbAccountPickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selected = accounts.find((a) => a.id === value);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onBlur]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    onBlur?.();
    triggerRef.current?.focus();
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    onBlur?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Select Facebook Ad Account"
          aria-invalid={!!error}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className={`flex h-8 w-full items-center justify-between rounded-lg border bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-destructive ring-3 ring-destructive/20"
              : "border-input hover:bg-muted/50"
          } ${open ? "border-ring ring-3 ring-ring/50" : ""}`}
        >
          {loading ? (
            <span className="text-muted-foreground">Loading accounts…</span>
          ) : selected ? (
            <span className="flex flex-1 items-center gap-2 truncate text-left">
              <span className="font-medium">{selected.name}</span>
              <span className="text-xs text-muted-foreground">{selected.id}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Search ad accounts…</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="rounded p-0.5 hover:bg-muted"
              >
                <XIcon className="size-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronDownIcon
              className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {open && (
          <div
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-md"
            onKeyDown={handleKeyDown}
          >
            <Command>
              <CommandInput placeholder="Search by name or account ID…" autoFocus />
              <CommandList>
                <CommandEmpty>No accounts found.</CommandEmpty>
                <CommandGroup heading="Facebook Ad Accounts">
                  {accounts.map((account) => (
                    <CommandItem
                      key={account.id}
                      value={`${account.name} ${account.id}`}
                      onSelect={() => handleSelect(account.id)}
                      data-checked={account.id === value}
                      className="cursor-pointer"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {account.id}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}
