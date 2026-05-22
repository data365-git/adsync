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
          aria-controls="fb-account-picker-listbox"
          aria-haspopup="listbox"
          aria-label="Select Facebook Ad Account"
          data-invalid={error ? "true" : undefined}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className={`flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 py-1 text-sm text-slate-900 transition-colors outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-destructive ring-destructive/20 ring-3"
              : "border-slate-300 hover:bg-slate-50"
          } ${open ? "border-sky-500 ring-2 ring-sky-500/20" : ""}`}
        >
          {loading ? (
            <span className="text-slate-500">Loading accounts…</span>
          ) : selected ? (
            <span className="flex flex-1 items-center gap-2 truncate text-left">
              <span className="font-medium">{selected.name}</span>
              <span className="text-xs text-slate-500">
                {selected.id}
              </span>
            </span>
          ) : (
            <span className="text-slate-500">Search ad accounts…</span>
          )}
          <div className="flex shrink-0 items-center gap-1">
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
                className="rounded p-0.5 hover:bg-slate-100"
              >
                <XIcon className="size-3.5 text-slate-500" />
              </span>
            )}
            <ChevronDownIcon
              className={`size-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {open && (
          <div
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
            onKeyDown={handleKeyDown}
          >
            <Command>
              <CommandInput
                placeholder="Search by name or account ID…"
                autoFocus
              />
              <CommandList id="fb-account-picker-listbox">
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
                        <span className="text-xs text-slate-500">
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
          className="text-destructive flex items-center gap-1.5 text-xs"
        >
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </p>
      )}
    </div>
  );
}
