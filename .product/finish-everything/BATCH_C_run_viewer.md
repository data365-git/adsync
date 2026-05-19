# Batch C — Run viewer: rows, retry, CSV export

**You are Codex.** Working dir: `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`. Branch `phase-a-foundation`. Don't commit, don't push.

## Read first

- `CLAUDE.md`
- `.product/finish-everything/PLAN.md`
- `src/app/(dashboard)/runs/[id]/page.tsx` and any sibling `RunDetailClient.tsx` if present
- `src/components/runs/StepResultCard.tsx`
- `src/server/api/routers/runs.ts` (existing procedures, especially `getById`)
- `src/server/core/executor.ts` (lines 96-118 — `buildStepCompleteLogMeta` is where sampleRows + outputSchema are persisted)

## Scope (P1 + P2)

Today the run detail shows step status + rowCount but NOT the actual output rows. Users can't debug a mapping or a Sheets write. Ship:

1. Display the per-step output rows (sampleRows from RunLog meta) in a table with column headers (outputSchema).
2. Pagination at 100 rows per page (or just show first N if rows ≤ N).
3. "Retry this run" button — re-runs the scenario from position 1 using same trigger MANUAL.
4. CSV export button per step (downloads rows as CSV).

---

## 1. Add `retry` mutation to runs router

**File:** `src/server/api/routers/runs.ts`

Add at the end of the existing router object:

```ts
retry: authedProcedure
  .input(z.object({ runId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const original = await db.run.findUnique({
      where: { id: input.runId },
      select: { scenarioId: true, userId: true },
    });
    if (!original) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
    }
    if (original.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not your run." });
    }
    const newRunId = await executeRun(
      original.scenarioId,
      "MANUAL",
      ctx.session.user.id,
    );
    return { runId: newRunId };
  }),
```

Import `executeRun` from `~/server/core/executor` and `TRPCError` from `@trpc/server` if not already imported. Don't import from a deep path — match the existing import style in the file.

## 2. Add `outputRows` accessor

The existing `runs.getById` query likely returns logs with meta. Make sure the response shape includes, per step, the `sampleRows` and `outputSchema` from each step's complete log. If `getById` already does this, skip; if not, derive it on the server side and add to the response shape.

**File:** `src/server/api/routers/runs.ts`

Inside `getById`, when assembling the response, group `RunLog` rows by `meta.position` and pick the row with both `sampleRows` and `outputSchema` (the step-complete log, not the step-start log). Return as `steps: Array<{ position, moduleType, sampleRows, outputSchema, rowCount, durationMs, status }>`.

If the file already has this shape, just confirm. If `outputSchema` is missing for older runs (no migration ran), default to `Object.keys(sampleRows[0] ?? {})`.

## 3. New `CsvExportButton` component

**Create:** `src/components/runs/CsvExportButton.tsx`

```tsx
"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

interface CsvExportButtonProps {
  filename: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  disabled?: boolean;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function CsvExportButton({ filename, columns, rows, disabled }: CsvExportButtonProps) {
  function handleExport() {
    if (rows.length === 0) return;
    const header = columns.map(escapeCsv).join(",");
    const body = rows
      .map((row) => columns.map((c) => escapeCsv(row[c])).join(","))
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
      disabled={disabled || rows.length === 0}
      onClick={handleExport}
      aria-label="Export rows as CSV"
    >
      <DownloadIcon className="size-3.5" />
      <span>Export CSV</span>
    </Button>
  );
}
```

## 4. Update `StepResultCard.tsx`

**File:** `src/components/runs/StepResultCard.tsx`

The card currently shows status + duration + rowCount. Add an expandable section underneath that renders the rows as a table when `sampleRows.length > 0`. Default expanded if `rowCount > 0`.

Structure (adapt to the existing card's classes):

```tsx
{sampleRows.length > 0 && (
  <div className="mt-3 rounded-lg border border-border bg-muted/20">
    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
      <span className="text-xs font-medium text-foreground">
        Output rows · showing {sampleRows.length} of {rowCount}
      </span>
      <CsvExportButton
        filename={`run-${runId}-step${position}.csv`}
        columns={outputSchema}
        rows={sampleRows}
      />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr>
            {outputSchema.map((col) => (
              <th
                key={col}
                className="text-left px-3 py-1.5 font-medium text-muted-foreground border-b border-border"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleRows.map((row, idx) => (
            <tr key={idx} className="border-b border-border last:border-0">
              {outputSchema.map((col) => (
                <td key={col} className="px-3 py-1.5 align-top">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

Helper at file bottom:

```tsx
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
```

Add `import { CsvExportButton } from "./CsvExportButton";` at the top.

**Mobile:** at <640px the table can horizontally scroll (already wrapped in `overflow-x-auto`). Don't switch to card layout — the structure must remain tabular for CSV mental-model parity.

## 5. Add "Retry run" button to RunDetailClient

**File:** locate the run detail client component. If it's `src/app/(dashboard)/runs/[id]/page.tsx` directly, you may need to extract a client component first. Otherwise it's at `src/app/(dashboard)/runs/[id]/RunDetailClient.tsx` (or similar).

Near the run header (status + timestamp), add:

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  disabled={retryMutation.isPending}
  onClick={() => retryMutation.mutate({ runId: run.id })}
  aria-label="Retry this run"
>
  <RefreshCwIcon className={cn("size-3.5", retryMutation.isPending && "animate-spin")} />
  <span>{retryMutation.isPending ? "Retrying…" : "Retry run"}</span>
</Button>
```

Wire the mutation:

```ts
const retryMutation = api.runs.retry.useMutation({
  onSuccess: ({ runId }) => {
    toast.success("New run started", {
      action: { label: "View", onClick: () => router.push(`/runs/${runId}`) },
    });
  },
  onError: (e) => {
    toast.error(`Retry failed: ${e.message}`);
  },
});
```

Imports: `RefreshCwIcon` from `lucide-react`, `toast` from `sonner`, `useRouter` from `next/navigation` if not already present.

## 6. Tests

Add a test for `runs.retry`:
- Calls executeRun with the original scenarioId and "MANUAL" trigger
- Returns new run id
- Throws FORBIDDEN if userId doesn't match

Add a unit test for `CsvExportButton.escapeCsv` if the helper is exported (testing module-level escape behavior). Or extract `escapeCsv` to `~/lib/csv.ts` and test it there.

---

## Verification gate

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm tsx --conditions react-server scripts/verify-canonical.ts
```

All must be:
- typecheck: exit 0
- lint: 0 warnings/errors
- test: ≥76/76 (you added retry test + CSV escape test)
- probe: 23/23 (unaffected)

Manual smoke if you have time:
- Visit http://localhost:3000/runs/<any-real-run-id>
- See output rows table; click Export CSV; file downloads
- Click Retry run; toast confirms new run

---

## Report back

- Files created / modified (paths)
- Whether you extracted `escapeCsv` to `~/lib/csv.ts` or kept it inline
- Whether RunDetailClient existed or you had to create one
- Gate results
- Deviations
