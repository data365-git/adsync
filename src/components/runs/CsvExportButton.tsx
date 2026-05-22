"use client";

import { DownloadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { escapeCsv } from "~/lib/csv";

interface CsvExportButtonProps {
  filename: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  disabled?: boolean;
}

export function CsvExportButton({
  filename,
  columns,
  rows,
  disabled,
}: CsvExportButtonProps) {
  function handleExport() {
    if (rows.length === 0) return;

    const header = columns.map(escapeCsv).join(",");
    const body = rows
      .map((row) => columns.map((column) => escapeCsv(row[column])).join(","))
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={(disabled ?? false) || rows.length === 0}
      onClick={handleExport}
      aria-label="Export rows as CSV"
      className="h-9 rounded-md border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
    >
      <DownloadIcon className="size-3.5" aria-hidden="true" />
      <span>Export CSV</span>
    </Button>
  );
}
