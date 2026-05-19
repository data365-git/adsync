# Zapier/Make-style modules — Plan

> **Audience:** Codex (executor). Claude is the planner; no code changes in main session.
> **Source of asks:** `references/claude.txt` and the Make.com screenshots in `references/` (`module.png`, `scenario.png`, `before.png`).
> **Branch:** keep on `phase-a-foundation`. One feature commit per epic. No pushes without explicit user confirmation.

---

## Why we're doing this

Right now the scenario builder lets users wire `Sheets → Bitrix` but the runtime is a black box: the run detail page only shows a collapsed JSON blob, the Bitrix create-lead step ignores upstream rows, and the trigger config asks users to copy/paste spreadsheet IDs by hand. The user is comparing this to Make.com (see references) and rightly calling it confusing.

Three concrete asks (verbatim, simplified):
1. **Run results must show passed data — what each step received and emitted.**
2. **Destination modules must offer Make-style field mapping** — show the target's fields, let the user bind each one to a literal or to an upstream column.
3. **Sheets modules must pick from the user's actual spreadsheets and tabs.** No more "paste the ID." This already works in `SheetsAppendConfig` / `SheetsUpsertConfig` after commit `ef7d33e`; the trigger (`WatchSheetsNewRowsConfig`) and any remaining text-input modules still need the same treatment.

A 4th epic covers UX polish so the canvas/modules read like Make's screenshots.

---

## Inventory of what already exists (do not rebuild)

- `connections.listSpreadsheets`, `listSheetTabs`, `listSheetColumns` tRPC procedures — `src/server/api/routers/connections.ts:157-235`.
- Cascading `Spreadsheet → Tab → Columns` picker, with cascade-reset and error-retry — `src/components/scenarios/builder/modules/SheetsAppendConfig.tsx`, `SheetsUpsertConfig.tsx`. Use these as the **reference pattern** for everywhere else.
- `triggerWatchSheetsNewRowsHandler` — already real (reads latest row from the configured tab). `src/server/core/module-handlers.ts:81-95`.
- `getLeadUrl(leadId)` helper + `leadUrl` already in `bitrixCreateLeadHandler` output. `src/server/bitrix24/client.ts:53-67`, `src/server/core/module-handlers.ts` (`bitrixCreateLeadHandler`).
- `StepResultCard` opens sample rows by default and surfaces `http(s)` URL fields as clickable chips — `src/components/runs/StepResultCard.tsx`.
- Run logs already capture `sampleRows`, `outputSchema`, `rowCount`, `durationMs` via `buildStepCompleteLogMeta` — `src/server/core/executor.ts:65-90`.

Anything below that overlaps with this is **extension**, not rewrite.

---

## Epic 1 — Run results that explain what happened

**Goal:** when the user opens `/runs/<id>`, every step shows (a) what config it actually ran with, (b) what rows it received from upstream, (c) what rows it emitted, (d) any URLs to inspect the side-effect (Bitrix lead, Sheets file). Mirror Make.com's I/O panel.

### Task 1.1 — Log step input alongside output

- **Files:** `src/server/core/executor.ts`, `src/server/core/run-context.ts`.
- **Change:** in the step loop (executor.ts ~line 150-170), before calling `handler(step, ctx, userId)`, capture:
  - `resolvedConfig`: the step's `config` object as-is (later, in Epic 2, this becomes the *interpolated* config — same field, just different content).
  - `upstreamRows`: the first 3 rows of `ctx.getUpstreamRows(step.position)` (cap to keep log small).
- **Log meta extension:** the "Starting step …" log already carries `{ stepId, position }`. Extend it with `inputConfig: resolvedConfig` and `inputSampleRows: upstreamRows.slice(0,3)`. Keep `outputSchema` / `sampleRows` on the "Completed step …" log as today.
- **Acceptance:** querying RunLog for any run shows a starting log with non-empty `inputConfig` (matches what the user configured) and `inputSampleRows` reflecting the previous step's `sampleRows`.

### Task 1.2 — Render Input + Output panels in StepResultCard

- **File:** `src/components/runs/StepResultCard.tsx`.
- **Change:** today the card has one section labelled "Sample rows" sourced from the Completed log's `sampleRows`. Split into two `<details open>` panels stacked vertically:
  - **Input** (compact): `Module: {moduleType}` · `Duration: {durationMs}` · "Config" (table view of key→value from `inputConfig`) · "Rows in" (table of `inputSampleRows`).
  - **Output:** "Rows produced: {rowCount}" · clickable URL chips (already exists) · "Rows out" table.
- **Tables, not raw JSON.** When a sample row is an object, render as a 2-column key/value table when there's one row, or a header-cell table when there are multiple rows. Fall back to JSON only if the data isn't object-shaped.
- **Acceptance:** open `/runs/<latest>`; for the bitrix step, "Input" panel shows `title=`, `name=`, etc. with the literals from config, plus an "Rows in" table showing the Sheets row that drove it. "Output" panel shows leadId + clickable Bitrix link.

### Task 1.3 — Step header subtitle on canvas

- **Files:** `src/components/scenarios/builder/StepCard.tsx`, supporting helper in `src/lib/modules.ts` (`getModule`).
- **Change:** Make.com shows e.g. "Search Rows" / "Add a Row" under each module icon. We have `ModuleDefinition.shortName` already (in `src/lib/modules.ts`). Render `module.shortName` as a small muted line under the step title in the canvas card. If `shortName` is missing, fall back to the module group ("triggers" / "sheets" / "bitrix24").
- **Acceptance:** open `/scenarios/<id>`; every step card now has a 2-line title (name + subtitle).

---

## Epic 2 — Field mapping (Make/Zapier style)

**Goal:** for every destination action (`bitrix.create_lead`, `bitrix.update_lead`, `bitrix.create_deal`, …) replace the static text inputs with a per-field "mapper" — each field accepts a literal OR an `{{upstreamColumn}}` token chosen from a dropdown of available upstream columns.

### Task 2.1 — Tiny token-interpolation utility

- **File:** new `src/server/core/template.ts`.
- **Export:** `interpolate(template: string, row: Record<string, unknown>): string` — replaces `{{key}}` with `String(row[key] ?? "")`. Trim the inner key. Leave unknown keys as empty string (do not throw — bitrix doesn't accept undefined). Add a tiny `pickTokens(template: string): string[]` for tests.
- **Tests:** `src/server/core/__tests__/template.test.ts` — empty, literal, single token, mixed, missing key, multiple instances of same token, escape behavior (decide: no escape syntax in v1, keep simple).
- **Acceptance:** `interpolate("Lead {{Name}} ({{id}})", { Name: "Alice", id: 7 }) === "Lead Alice (7)"`.

### Task 2.2 — Resolved-config helper in the executor

- **File:** `src/server/core/executor.ts` (or a small new `src/server/core/resolve-config.ts` imported from the executor).
- **Behavior:** before invoking each handler, walk the step's `config` object and for every string-valued field, call `interpolate(value, upstreamRow0)` where `upstreamRow0 = ctx.getUpstreamRows(step.position)[0]` (or `{}` if none). Recurse one level into plain-object children, but skip arrays (`mappedFields` etc. stay literal). Pass the **resolved** config to the handler.
- **Implementation detail:** since handlers read `step.config` directly via `cfg<T>(step)`, the cleanest path is to pass `resolvedStep` (a shallow copy of `step` with `config` replaced) into the handler signature. Update `Handler` type and every existing handler call site if needed — most handlers don't care.
- **Acceptance:** with `bitrix.create_lead.title = "Lead from {{Name}}"` and an upstream Sheets row `{ Name: "Alice" }`, the Bitrix REST call receives `title="Lead from Alice"`. Verified via run log's `inputConfig` field (set in Task 1.1).

### Task 2.3 — Field-mapping UI component

- **File:** new `src/components/scenarios/builder/modules/FieldMapper.tsx`.
- **Props:** `{ label, value, onChange, upstreamColumns: string[], placeholder?, multiline?, required? }`.
- **Behavior:** renders an `<input>` (or `<textarea>` if `multiline`) plus a small "+" button. Clicking "+" opens a popover listing `upstreamColumns`; selecting `Name` appends `{{Name}}` at the current cursor position. Show a chip strip above the input listing tokens currently used (parsed via `pickTokens`).
- **Empty-state:** when `upstreamColumns` is empty (no upstream step yet, or trigger not configured), still render the text input but hide the "+" button and show a subtle helper "Connect a trigger to enable column mapping." No errors.
- **Acceptance:** isolated story renders, typing + clicking "+" inserts tokens correctly, keyboard accessible (Tab into input, Enter inserts selected token).

### Task 2.4 — Wire FieldMapper into bitrix.create_lead

- **File:** `src/components/scenarios/builder/modules/BitrixCreateLeadConfig.tsx`.
- **Change:** replace each `<Input>` for `title`, `name`, `lastName`, `phone`, `email`, `comments` with `<FieldMapper>`. Keep `sourceId` as a `<Select>` (it's an enum, not free text). Pull `upstreamColumns` via a new prop `prevStepOutputColumns: string[]` provided by `StepConfigModal` — see Task 2.5.
- **Acceptance:** open the bitrix step config in the builder; each field shows the "+" button; clicking it lists the Sheets columns from the upstream trigger; saving persists `{{Name}}` style tokens into config.

### Task 2.5 — StepConfigModal feeds upstream columns

- **Files:** `src/components/scenarios/builder/StepConfigModal.tsx`, `src/components/scenarios/builder/ScenarioBuilder.tsx`.
- **Behavior:** when the config modal opens for step N, walk steps 1..N-1; find the most recent step whose `moduleType` is a Sheets read/trigger (`trigger.watch.sheets_new_rows`, `sheets.find_rows`, `sheets.get_row`) AND has both `spreadsheetId` and `tabName` set; call `api.connections.listSheetColumns.useQuery({ spreadsheetId, tabName })` and pass the result down as `prevStepOutputColumns`. Cache for 60s like the existing pattern.
- **Fallback:** if upstream is a different source (FB insights etc.) read columns from the module's catalog `sampleOutput[0]` keys via `getModule(moduleType)?.sampleOutput[0]`. Then `prevStepOutputColumns = Object.keys(sample)`.
- **Acceptance:** opening the bitrix step in a Sheets-driven scenario shows real sheet headers in the "+" picker; in an FB-insights scenario shows FB metric keys.

### Task 2.6 — Apply FieldMapper to remaining destination modules

- **Files:** `BitrixUpdateLeadConfig.tsx`, `BitrixCreateDealConfig.tsx`, `BitrixUpdateDealConfig.tsx`, `BitrixCreateSmartProcessItemConfig.tsx`.
- **Same recipe** as Task 2.4. Only string-typed config fields get FieldMapper; selects (status, pipeline) stay selects.
- **Acceptance:** field mapping works identically across all Bitrix destination modules.

---

## Epic 3 — Sheets pickers everywhere (no more pasted IDs)

**Goal:** every module that references a spreadsheet/tab/column shows live dropdowns sourced from the connected Google account.

### Task 3.1 — Convert WatchSheetsNewRowsConfig to cascading pickers

- **File:** `src/components/scenarios/builder/modules/WatchSheetsNewRowsConfig.tsx`.
- **Change:** replace the three `<Input>` fields with the same cascading-dropdown pattern used in `SheetsAppendConfig.tsx:105-220`:
  - `Spreadsheet` ← `connections.listSpreadsheets`
  - `Tab` ← `connections.listSheetTabs({ spreadsheetId })`, enabled when spreadsheetId is set
  - `Watch column` ← `connections.listSheetColumns({ spreadsheetId, tabName })`, enabled when both set
- **Loading / error / empty states** must match the existing cards: spinner placeholder, "Could not load…" with retry button, "No spreadsheets found" empty state pointing to `/connections`.
- **Cascade resets:** changing spreadsheet clears tabName + watchColumn; changing tab clears watchColumn.
- **Remove** the "Polling interval" banner — `worker/scheduler.ts` runs the poller; the user doesn't configure interval here. (If keeping a banner, just say "Polled by the worker every 5 minutes.")
- **Catalog update:** `src/lib/modules.ts` entry for `trigger.watch.sheets_new_rows` — change `configSchema` field `type` from `text` to a new sentinel `sheets-picker` so any future generic renderer treats them differently. Optional but recommended.
- **Acceptance:** open the trigger step on a fresh scenario; three dropdowns appear with the user's real data; selecting a spreadsheet narrows tabs; selecting a tab narrows columns.

### Task 3.2 — Audit and convert any remaining text-input Sheets modules

- **Scan list** — confirm each of these uses pickers already (per recent commit `ef7d33e` they should): `SheetsFindRowsConfig.tsx`, `SheetsUpdateRowConfig.tsx`. If any still take plain text for `spreadsheetId` or `tabName`, port them in the same PR.
- **Out of scope here:** `SheetsCreateTabConfig`, `SheetsDeleteRowConfig`, `SheetsGetRowConfig` are wired to `notImplementedHandler` (see `MODULE_AUDIT.md`); we don't pretty-print configs for modules that throw at run time.

### Task 3.3 — Spreadsheet picker shows "Connected as <email>"

- **Files:** the picker block in each cascading-dropdown config (or extract a shared `<SpreadsheetSelect>` component if duplication grows past 2 copies).
- **Change:** under the spreadsheet dropdown, render a one-line caption "Connected as `{conn.email}`" using `connections.googleSheetsResources.identifier`. If the user has multiple Google accounts they can immediately see which one is being read.
- **Acceptance:** caption renders below the spreadsheet picker; matches the email shown on `/connections`.

---

## Epic 4 — UX polish to match Make.com references

**Goal:** the scenario canvas, module modal header, and step cards visually echo the Make screenshots without rewriting the design system.

### Task 4.1 — Module modal header

- **File:** `src/components/scenarios/builder/StepConfigModal.tsx`.
- **Change:** in the dialog title row, render the module's brand icon (24px) + module name + module short subtitle (e.g. "Google Sheets · Watch new rows"). Today the title is a plain string. Use `src/lib/integration-icons.tsx` for the icon.
- **Acceptance:** modal header matches `references/module.png` styling (icon + bold name + muted submodule name).

### Task 4.2 — Canvas step cards: brand icon + connector line

- **File:** `src/components/scenarios/builder/StepCard.tsx`.
- **Change:** each card already has the brand icon tile. Per Make: render a small numeric badge ("1", "2", …) at the top-right of the icon, and a 1px connector line between consecutive cards (already partly there — make it dotted, 2px gap).
- **Acceptance:** visually compare to `references/scenario.png` — numeric badge + dotted connector visible.

### Task 4.3 — "Run once" footer button + last-run chip

- **File:** `src/components/scenarios/builder/BuilderHeader.tsx` (or the equivalent footer if one exists).
- **Change:** Make's canvas has a big "Run once" button bottom-left. Today we have a "Test Run" / "Run Now" button somewhere in the modal flow; promote it to a fixed action button in the BuilderHeader region (which is already pinned at 60px height) with two slots:
  - **Run once** — kicks `scenarios.testRun`.
  - **Last run** chip — small badge showing `success/failed` + relative time, linking to `/runs/<lastRunId>`.
- **Acceptance:** button always visible from the canvas; chip updates after each run; clicking the chip jumps to the run detail.

---

## Out of scope (do not touch in this initiative)

- The worker's separate Sheets→Bitrix sync (`src/server/sync/orchestrator.ts`, `src/server/sheets/poller.ts`). It is a parallel codepath unrelated to scenarios.
- Real polling cadence for `trigger.watch.sheets_new_rows`. Today the executor reads the latest row at run time, which is fine for Test Run; production polling is Phase 4.
- Replacing `notImplementedHandler` modules. Per `MODULE_AUDIT.md`, those are deferred.
- Auth / OAuth refresh changes. Working today.
- Mobile responsive sweep of the canvas. Out of scope; covered by the existing UX_AUDIT.

---

## Sequencing & dependencies

```
Epic 3 (Sheets pickers)  ─┐
                          ├─► Epic 2 (Field mapping)  ─► Epic 1 (Run detail surfaces resolved config)
Epic 1 task 1.1 first  ───┘                                          │
                                                                     └─► Epic 4 (UX polish, pure visual, can run in parallel after Epic 2)
```

- **Epic 1 task 1.1 (log inputConfig)** is the linchpin — do it first so the executor records resolved config, then Epic 2 can land and the data shows up automatically in the run detail.
- **Epic 3 (Sheets pickers for trigger)** is independent — can run in parallel with Epics 1–2.
- **Epic 4** is pure presentation and can land any time after the others stop churning the canvas/modal files.

Suggested PR order:
1. PR — Epic 1, task 1.1 (executor logs `inputConfig` + `inputSampleRows`).
2. PR — Epic 3, tasks 3.1–3.3 (Sheets pickers in trigger, captions).
3. PR — Epic 2, tasks 2.1–2.2 (template util + executor resolution + tests).
4. PR — Epic 2, tasks 2.3–2.5 (FieldMapper + bitrix.create_lead + modal wiring).
5. PR — Epic 2, task 2.6 (other Bitrix modules).
6. PR — Epic 1, tasks 1.2–1.3 (StepResultCard split, canvas subtitle).
7. PR — Epic 4 (visual polish).

Each PR ≤ ~250 LOC. Bigger than that → split further.

---

## Acceptance for "done"

The user opens the running app and:

1. **In the scenario builder**, the `Watch Sheets — New Rows` trigger shows a dropdown of their actual spreadsheets (not a text box). Selecting one populates a tab dropdown; selecting a tab populates a column dropdown.
2. **The Bitrix create-lead step** shows every field with a "+" button. Clicking + lists the sheet's columns. They type `Lead from {{Name}}` and the token chip appears.
3. **They click "Run once".** A run completes.
4. **On `/runs/<id>`**, each step shows two panels — Input (config + upstream rows) and Output (sample rows + clickable Bitrix link). The Bitrix step's Input panel shows `title = "Lead from Alice"` (interpolated). They click the lead-URL chip and Bitrix24 opens with the new lead populated with Alice's data.

If any of those fail, the initiative isn't done.

---

## Hand-off note for Codex

Run order:
1. Read this file end-to-end.
2. Read `CLAUDE.md` for runtime rules (Prisma + nodejs runtime requirement, OneDrive node_modules junction, no `console.log` in committed code, etc.).
3. Read `docs/MODULE_AUDIT.md` so you don't accidentally implement deferred modules.
4. Work through the PRs in the order above. After each PR: `pnpm typecheck && pnpm lint && pnpm test` must pass before committing.
5. Open a draft PR per epic on `phase-a-foundation`. Do **not** push without an explicit confirmation from the user in their terminal.
6. After all PRs land, run the smoke flow in `docs/SMOKE_TEST.md` and update it if new steps are needed (especially the run-detail screenshot).

Hard rules carried over from `CLAUDE.md`:
- Don't add `console.log` / `any` / `@ts-ignore` to committed code.
- All `app/api/**` routes that touch Prisma must `export const runtime = "nodejs"`.
- Never call `Date.now()` / `randomUUID()` inside `useMemo` / lazy `useState` / render bodies (hydration mismatch).
- One logical change per commit. Imperative mood. Scope prefix (`scenarios:`, `runs:`, `connections:`).
