import React from "react";

const MARK_CLASS = "bg-amber-100 text-amber-900 rounded-sm";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlight(text: string, q: string): React.ReactNode[] {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [text];

  const source = `(${tokens.map(escapeRegExp).join("|")})`;
  const pattern = new RegExp(source, "gi");
  const matchPattern = new RegExp(source, "i");
  const parts = text.split(pattern);

  return parts
    .filter((part) => part.length > 0)
    .map((part, index) =>
      matchPattern.test(part)
        ? React.createElement(
            "mark",
            { key: `${part}-${index}`, className: MARK_CLASS },
            part,
          )
        : React.createElement("span", { key: `${part}-${index}` }, part),
    );
}

export function highlightMatches(text: string, query: string): React.ReactNode {
  return highlight(text, query);
}
