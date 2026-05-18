"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useUpstreamValues } from "../UpstreamValuesContext";

type FieldMapperProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  upstreamColumns: string[];
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  error?: string;
  /** When true the right-rail values panel is visible at large breakpoints —
   * hide the "+" popover there (it duplicates the rail). */
  panelVisible?: boolean;
};

export function FieldMapper({
  label,
  value,
  onChange,
  upstreamColumns,
  placeholder,
  multiline,
  required,
  error,
  panelVisible,
}: FieldMapperProps) {
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const fieldId = React.useId();
  const inputName = `mapper-${fieldId}`;
  const valuesContext = useUpstreamValues();
  const [isDropTarget, setIsDropTarget] = React.useState(false);

  // ── Shared insert logic — used by both click-to-insert and DnD drop ────────
  const insertText = React.useCallback((token: string) => {
    const el = inputRef.current;
    if (!el) {
      onChange(`${value}${token}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }, [onChange, value]);

  React.useEffect(() => {
    return valuesContext?.registerMapper(fieldId, insertText);
  }, [fieldId, insertText, valuesContext]);

  function insertToken(column: string) {
    insertText(`{{${column}}}`);
  }

  // ── DnD handlers ───────────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDropTarget(true);
  }

  function handleDragLeave() {
    setIsDropTarget(false);
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDropTarget(false);
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;
    insertText(text);
  }

  const dropRingClass = isDropTarget
    ? "outline outline-2 outline-emerald-500 outline-offset-2"
    : "";

  const controlClassName = cn(
    "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring",
    "min-h-11 w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2",
    dropRingClass,
  );

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={inputName}>
        {label}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div className="flex gap-2">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={inputName}
            name={inputName}
            autoComplete="off"
            spellCheck={false}
            rows={3}
            value={value}
            placeholder={placeholder}
            onFocus={() => valuesContext?.setFocusedMapper(fieldId)}
            onChange={(event) => onChange(event.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-invalid={!!error}
            className={cn(controlClassName, "resize-y")}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id={inputName}
            name={inputName}
            autoComplete="off"
            spellCheck={false}
            value={value}
            placeholder={placeholder}
            onFocus={() => valuesContext?.setFocusedMapper(fieldId)}
            onChange={(event) => onChange(event.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-invalid={!!error}
            className={cn("min-h-11", dropRingClass)}
          />
        )}
        {upstreamColumns.length > 0 ? (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(panelVisible && "lg:hidden")}
                />
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="sr-only">Insert upstream column</span>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-72 overflow-y-auto p-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Upstream columns
              </div>
              {upstreamColumns.map((column) => (
                <button
                  key={column}
                  type="button"
                  className="block w-full rounded-md px-2 py-2 text-left font-mono text-xs hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() => insertToken(column)}
                >
                  {column}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {upstreamColumns.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Pick a value from the right rail or configure the trigger to enable mapping.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
