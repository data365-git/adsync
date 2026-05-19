# Batch A — Picker consolidation, validation surfacing, catalog cleanup

**You are Codex.** Working dir: `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`. Branch `phase-a-foundation`. Don't commit, don't push.

## Read first

- `CLAUDE.md` (project map, conventions, runtime rules)
- `.product/finish-everything/PLAN.md` (global conventions, dispatch sequence — your batch is independent and parallel with B+C+D)
- `docs/MODULE_AUDIT.md` (which modules are real vs deferred — source of truth)

## Scope (P0 + P1)

1. **B7**: Remove 3 wrongly-deferred modules from `validateStepConfig` deferred case. They have real handlers.
2. **B8**: Make `errors._form` visible in `StepConfigModal` as a banner.
3. **Picker consolidation**: replace `TriggerPickerCards` + `ActionPickerCards` (inline cards in `ScenarioBuilder.tsx`) with a single "Choose module" button that opens `ModuleLibraryModal`.
4. **Catalog cleanup**: remove `sheets.watch_new_rows` from the catalog (no handler, no UI) AND from both Zod enums.
5. **Delete orphan**: `src/components/scenarios/builder/modules/BitrixCreateSmartProcessItemConfig.tsx` is not in the catalog, not in any handler, not in `MODULE_CONFIG_MAP`. Dead code. Delete the file.

---

## 1. Fix `validateStepConfig` (B7)

**File:** `src/components/scenarios/builder/StepCard.tsx`

Find the deferred-modules fall-through case (around lines 180-195). Remove these 3 cases — they have real handlers:
- `case "trigger.webhook":`
- `case "trigger.watch.bitrix_new_lead":`
- `case "fb.list_ad_accounts":`

Verify against `src/server/core/module-handlers.ts` HANDLERS map: a module belongs in the deferred case **only if** its entry is `notImplementedHandler`. After B7 the deferred list must be exactly these 8 + (after step 4 removes one) 7:
- `fb.list_ads`
- `fb.get_ad`
- `sheets.delete_row`
- `sheets.get_row`
- `sheets.create_tab`
- ~~`sheets.watch_new_rows`~~ (removed in step 4)
- `bitrix.find_leads`
- `bitrix.create_deal`
- `bitrix.update_deal`

Also remove these 3 from the deferred case body — they need their own validation (for now, no required fields → empty case, since their handlers don't need specific config validation):

```ts
case "trigger.webhook":
  // No required fields. Optional `secret`.
  break;
case "trigger.watch.bitrix_new_lead":
  // No UI-required fields; worker is the data source.
  break;
case "fb.list_ad_accounts":
  // No required fields — lists all ad accounts for the connected user.
  break;
```

## 2. Render `errors._form` banner (B8)

**File:** `src/components/scenarios/builder/StepConfigModal.tsx`

The `validationErrors` object already exists (line 218). Find where `<DialogHeader>` closes (around line 267). Immediately after the DialogHeader, before the tab strip / form body, render:

```tsx
{validationErrors._form ? (
  <div
    role="alert"
    className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
  >
    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <p>{validationErrors._form}</p>
  </div>
) : null}
```

Import `TriangleAlertIcon` from `lucide-react` if not already imported.

The banner must:
- Appear inside the modal scroll region, NOT inside the tabs panel
- Use `role="alert"` for screen readers
- Have the same horizontal padding as the rest of the modal body (`mx-6`)
- Not block the form interaction below it

## 3. Replace picker cards with library entry point

**File:** `src/components/scenarios/builder/ScenarioBuilder.tsx`

Currently there are two inline picker components (in the same file):
- `TriggerPickerCards` (around lines 107-189) — hardcodes 3 of 5 triggers
- `ActionPickerCards` (around lines 194-280) — hardcodes 10 of 19 actions

And the render block (around lines 632-707) shows them inline:
- `{showTriggerPicker && <TriggerPickerCards onPick={handlePickTrigger} />}`
- `{showActionPicker && <li><StepConnector /><ActionPickerCards onPick={handlePickAction} /></li>}`

**Replace with:** a single "Choose module" button that opens the existing `ModuleLibraryModal`. The library already filters by `isTriggerSlot` so it knows what to show.

### Steps

a) **Delete** the entire `TriggerPickerCards` component (and its `TRIGGER_OPTIONS` constant, `TriggerPickerProps` interface).

b) **Delete** the entire `ActionPickerCards` component (and `ACTION_GROUPS`, `ACTION_GROUP_LABELS`, `ActionPickerProps` interface).

c) Add a single replacement component near the top of the file:

```tsx
// ─── EmptyStepSlot ────────────────────────────────────────────────────────────
// Shown when the next step in the chain isn't picked yet.
// Opens ModuleLibraryModal — the single source of truth for available modules.

interface EmptyStepSlotProps {
  kind: "trigger" | "action";
  onOpenLibrary: () => void;
}

function EmptyStepSlot({ kind, onOpenLibrary }: EmptyStepSlotProps) {
  const isTrigger = kind === "trigger";
  const title = isTrigger ? "Step 1: When this happens…" : "Step 2: Then do this…";
  const helper = isTrigger
    ? "Pick a trigger — Schedule, Webhook, Manual run, or watch a Sheet/Bitrix list for new items."
    : "Pick an action — pull Facebook insights, write to Sheets, or create/update Bitrix records.";
  return (
    <button
      type="button"
      onClick={onOpenLibrary}
      className={cn(
        "mt-4 flex w-full flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6 text-left",
        "transition-colors hover:border-primary/40 hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{helper}</span>
      <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
        + Choose module
      </span>
    </button>
  );
}
```

d) In the render block, replace the two `{showTriggerPicker && …}` and `{showActionPicker && …}` usages:

```tsx
{/* Trigger empty slot */}
{showTriggerPicker && (
  <EmptyStepSlot kind="trigger" onOpenLibrary={() => openModuleLibrary(1)} />
)}

{/* (existing steps loop here, unchanged) */}

{/* Action empty slot — after trigger picked, no action yet */}
{showActionPicker && (
  <li className="list-none">
    <StepConnector />
    <EmptyStepSlot kind="action" onOpenLibrary={() => openModuleLibrary(2)} />
  </li>
)}
```

e) Verify `openModuleLibrary(position: number)` exists and is the function that sets `modalInsertAt` + `modalOpen=true`. If its signature differs, adapt the call.

f) Remove `handlePickTrigger` and `handlePickAction` if they're no longer called (the library uses `onSelectModule` which already calls `handleSelectModule`). If they ARE still referenced elsewhere, leave them.

g) Update imports — `getIntegrationMeta` may no longer be needed in this file; remove if unused. `WebhookIcon`, `ClockIcon`, `ZapIcon` may be removable. Run `pnpm lint` to confirm; ESLint will flag unused.

## 4. Remove `sheets.watch_new_rows` from catalog

It has no MODULE_CONFIG_MAP entry, no real handler, and no business value standalone (the actual sheet-watching trigger is `trigger.watch.sheets_new_rows`, which is functional).

**Touch these files** — all three must stay in lock-step per the [[duplicate_module_type_schema]] convention:

a) **`src/lib/modules.ts`** — find the MODULES entry with `id: "sheets.watch_new_rows"` and delete the whole `{ … }` object.

b) **`src/server/api/routers/modules.ts`** — find `ModuleTypeSchema = z.enum([…])` and remove `"sheets.watch_new_rows",` from the list.

c) **`src/server/api/routers/scenarios.ts`** — same Zod enum, remove the same entry.

d) **`src/server/core/module-handlers.ts`** — find the `HANDLERS` map and remove the `"sheets.watch_new_rows": notImplementedHandler,` line.

e) **`src/components/scenarios/builder/StepCard.tsx`** — remove `case "sheets.watch_new_rows":` from the deferred-modules fall-through in `validateStepConfig`. Also remove any case for it in the `renderConfigSummary` switch (around lines 453-460 in the current file).

f) **`src/server/mocks/types.ts`** — if a `ModuleType` union or type alias mirrors the enum, remove the entry there too. Grep for `sheets.watch_new_rows` to be sure no stragglers.

After all edits, grep the repo for `sheets.watch_new_rows`. There should be **zero** occurrences.

## 5. Delete orphan config file

```powershell
Remove-Item src\components\scenarios\builder\modules\BitrixCreateSmartProcessItemConfig.tsx
```

Then grep the repo for `BitrixCreateSmartProcessItem` — there should be zero references. If any import exists, remove it (likely none).

---

## Verification gate

Run from repo root:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm tsx --conditions react-server scripts/verify-canonical.ts
```

All must be:
- typecheck: exit 0
- lint: 0 warnings, 0 errors
- test: 74/74 pass (no regression)
- probe: 23/23 PASS, and `F19.no_missing_handlers` still says "all 23 catalog types have handlers" (was 24; will be 23 after sheets.watch_new_rows removal)

**The probe assertion `all 24 catalog types have handlers` is calculated dynamically** from `MODULES.length`, so it will become `all 23` automatically. Don't change the probe.

If any gate fails: revert your changes in that file, re-run gates. Don't commit partial work.

---

## Report back

- List of files modified / deleted (paths only)
- Grep results for `sheets.watch_new_rows` (should be empty) and `BitrixCreateSmartProcessItem` (should be empty)
- Gate results: typecheck / lint / test / probe lines
- Anything deviated from spec (with reason)
