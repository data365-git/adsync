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
import { pickTokens } from "~/server/core/template";

type FieldMapperProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  upstreamColumns: string[];
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  error?: string;
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
}: FieldMapperProps) {
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const tokens = pickTokens(value);
  const fieldId = React.useId();
  const inputName = `mapper-${fieldId}`;

  function insertToken(column: string) {
    const token = `{{${column}}}`;
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
  }

  const controlClassName =
    "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring min-h-11 w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2";

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
      {tokens.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tokens.map((token, index) => (
            <span
              key={`${token}-${index}`}
              className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {token}
            </span>
          ))}
        </div>
      ) : null}
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
            onChange={(event) => onChange(event.target.value)}
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
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={!!error}
            className="min-h-11"
          />
        )}
        {upstreamColumns.length > 0 ? (
          <Popover>
            <PopoverTrigger render={<Button type="button" variant="outline" size="icon" />}>
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
          Connect a trigger to enable column mapping.
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
