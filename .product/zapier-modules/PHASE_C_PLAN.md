# Phase C — Make.com-grade scenario UX

> **Audience:** Codex (executor). Claude planned this; no code changes in main session.
> **Branch:** `phase-a-foundation`. One feature commit per epic. No pushes without explicit user confirmation.
> **Builds on:** Phase A (Sheets cascade pickers) + Phase B (run logging, FieldMapper, Input/Output panels). All landed and unpushed in commits `2b33d56…42b52d2`.

---

## Why this exists

The user just tried the Phase B build end-to-end and called it confusing. Three pains, verbatim:

1. **"I need to make a test run for each module and for scenario itself."** Today the only run path is "Run once" — runs the whole scenario. There's no way to test one step in isolation.
2. **"I need to see the test results on the same scenario page."** Today results live on `/runs/<id>` (separate route). The user wants them inline on `/scenarios/<id>`, so they can iterate on config + result without nav round-trips.
3. **"Each prior module must provide values like Make.com."** The FieldMapper's "+" popover only lists column names (`name`, `email`). The user's reference (Make.com) shows each upstream module as a rich card with its *actual sample values*, click-to-insert. Plus our inputs are missing `autoComplete="off"`, so the browser's native autocomplete fires and competes with our UI (see `local/values.png` — phone-number autocomplete obscured the field).

Goal: the scenario builder feels indistinguishable from Make.com / Zapier in interaction density.

---

## Inventory of what already exists (do not rebuild)

- `FieldMapper.tsx` — input + "+" popover with column names + token chip strip. **Needs upgrading**, not rebuilding.
- `StepResultCard.tsx` — Input/Output panels with table rendering, already split per Phase B.
- `scenarios.testRun` tRPC mutation — already wired; runs the whole scenario. **Needs a sibling that runs one step.**
- `connections.listSheetColumns` — gives column names. **Needs a sibling that returns sample values too (or extend it).**
- Run logs already capture `inputConfig`, `inputSampleRows`, `sampleRows`, `rowCount`, `durationMs` per step (commit `2b33d56`).

---

## Epic C.1 — Per-step test run

**Goal:** each step's config modal has a "Test this step" button. Clicking it runs just that step using the latest upstream sample, surfaces input + output inline in the modal.

### Task C.1.1 — Backend tRPC procedure

- **File:** `src/server/api/routers/scenarios.ts`
- **Add:** `testRunStep({ scenarioId, stepId })` `authedProcedure.mutation` — runs `executeRun` constrained to a single step, OR builds a transient context with mock upstream rows from the scenario's most recent successful run, OR (simplest) executes steps 1..N where N is the requested step's position, then returns the Nth step's log.
- **Output shape:** `{ inputConfig, inputSampleRows, outputSampleRows, rowCount, durationMs, error?, leadUrl? }` — same shape as a single `RunLog` row, no Run row needed.
- **Persistence:** do not write a `Run` row for per-step test runs (keep run history clean). Persist nothing, just return.
- **Acceptance:** calling `testRunStep` for the bitrix.create_lead step in a Sheets→Bitrix scenario returns interpolated config (`title = "Lead from Alice"`) plus the lead's real URL.

### Task C.1.2 — Modal "Test this step" button

- **File:** `src/components/scenarios/builder/StepConfigModal.tsx`
- **Add:** a "Test this step" button next to "Done" in the modal footer. Disabled if the step has unsaved validation errors OR is the trigger (test those via the whole-scenario Run once).
- **Behavior:** clicking calls `scenarios.testRunStep.useMutation`; while pending shows a spinner; on success swaps the modal body to show an inline result panel (re-uses `StepResultCard` layout) AND keeps the Configure tab accessible via the existing tab switcher.
- **Sample tab integration:** the modal already has Configure/Sample tabs. Add a 3rd tab "Last test" that shows the most recent `testRunStep` result for this step in this session (lives in local React state — don't persist to DB).
- **Acceptance:** configure a bitrix step → click "Test this step" → see input panel (table of resolved config + upstream rows used) + output panel (Bitrix lead created, URL clickable) without leaving the modal.

---

## Epic C.2 — Inline run results on the scenario page

**Goal:** running a scenario (whole or per-step) shows results without navigating to `/runs/<id>`. The current "Last run" chip stays as the link to historical detail.

### Task C.2.1 — Run results drawer on the scenario page

- **File:** `src/app/(dashboard)/scenarios/[id]/ScenarioDetailClient.tsx`, new `src/components/scenarios/builder/RunResultsDrawer.tsx`
- **Behavior:** after clicking "Run once" in `BuilderHeader`, slide in a bottom-aligned drawer (160px tall when collapsed, expandable to 50vh) listing each step with its Input + Output panels — same content as `/runs/[id]` but inline. Closing the drawer doesn't delete the run; it just hides the panel.
- **State:** drawer state lives in `ScenarioDetailClient` React state; the run's id is the source of truth (re-fetch `runs.getById` on demand).
- **Acceptance:** click Run once → drawer slides up showing every step's input/output → click a step's title to scroll its panel into focus → click "Open full run" to jump to `/runs/<id>` for the historical view.

### Task C.2.2 — Reuse StepResultCard for both routes

- **File:** `src/components/runs/StepResultCard.tsx`
- **Change:** ensure the card renders identically when consumed from the inline drawer AND the standalone `/runs/<id>` page. Likely no change needed — verify by importing it from both routes and ensuring layout/spacing tokens are shared.

---

## Epic C.3 — Make-style upstream values panel

**Goal:** when editing step N's config, the modal shows a side panel listing every upstream step's *actual* output fields with sample values, one-click insertable. Replaces the cramped "+" popover (or augments it — see Task C.3.3).

### Task C.3.1 — Backend: include sample values, not just column names

- **File:** `src/server/api/routers/connections.ts`
- **Extend:** `listSheetColumns({ spreadsheetId, tabName })` already returns `string[]`. Add a sibling `listSheetSample({ spreadsheetId, tabName, rowCount?: 1 })` that returns `{ columns: string[], rows: Record<string, string>[] }` — reads `A1:ZZ${rowCount+1}` and returns header + first N rows as objects.
- **Caching:** same 60s staleTime as the other queries.
- **Acceptance:** calling `listSheetSample({ spreadsheetId: ..., tabName: "Sheet1" })` returns `{ columns: ["id", "name", "email"], rows: [{ id: "1", name: "Alice", email: "alice@example.com" }] }`.

### Task C.3.2 — Upstream catalog helper

- **File:** new `src/components/scenarios/builder/upstream-catalog.ts`
- **Export:** `buildUpstreamCatalog(steps, currentPosition, sheetSample?)` → `{ stepId, moduleType, label, fields: { key: string, sampleValue: string | null }[] }[]`. Walks steps 1..currentPosition-1, for each:
  - If module is `trigger.watch.sheets_new_rows`, `sheets.find_rows`, `sheets.get_row`: pull `sheetSample.columns` + `sheetSample.rows[0]`. Each field's `sampleValue` is the row's value.
  - Otherwise: use the module's `sampleOutput[0]` from `src/lib/modules.ts` catalog. `sampleValue` = stringified value from sample.
- **Acceptance:** isolated unit test in `__tests__/upstream-catalog.test.ts` covers Sheets trigger + FB insights upstream cases.

### Task C.3.3 — Right-rail values panel in StepConfigModal

- **File:** `src/components/scenarios/builder/StepConfigModal.tsx`, new `src/components/scenarios/builder/UpstreamValuesPanel.tsx`
- **Behavior:** when the modal opens for a non-trigger step, the modal becomes 2-column: 70% config form (left), 30% scrollable values panel (right). Each upstream module is a card with the module's brand icon + name; each field is a row showing `key` (mono, muted) and `sampleValue` (truncated to 40 chars, full on hover). Clicking a row inserts `{{key}}` at the currently-focused FieldMapper input's cursor position (or at the end if no field is focused).
- **Focus tracking:** FieldMapper tracks "I am the most recently focused mapper" via a small context (`UpstreamValuesContext` shared at modal level). Clicking a panel row calls `context.insertAtFocused("{{key}}")`.
- **Mobile / narrow modals:** below 900px modal width, the values panel collapses into a tab labeled "Values from previous steps" — same content, different layout.
- **Empty state:** if `currentPosition === 1` (this is the trigger), hide the panel entirely.
- **Acceptance:** open the Bitrix create_lead config in a Sheets→Bitrix scenario → right rail shows "Watch Sheets — New Rows" card with rows like `id = "1"`, `name = "Alice"`, `email = "alice@example.com"` → click `name` row → `{{name}}` appears in whichever Bitrix field had focus.

### Task C.3.4 — Keep "+" popover as a fallback, fix browser autocomplete

- **File:** `src/components/scenarios/builder/modules/FieldMapper.tsx`
- **Changes:**
  - Add `autoComplete="off"`, `spellCheck={false}`, and `name={\`mapper-${label}\`}` (unique-ish) to the `<Input>` and `<textarea>` — the user's browser is showing saved phone numbers in `values.png` because the inputs default to autocomplete on.
  - Keep the "+" popover for quick single-field inserts; the right rail is for browsing.
  - When `upstreamColumns` is empty AND the new values panel exists, the helper text becomes: "Pick a value from the right rail or configure the trigger to enable mapping."
- **Acceptance:** typing in the phone field no longer triggers the browser's saved-number popup.

---

## Out of scope (don't touch)

- Per-step test runs that write to external systems irreversibly with the user's blessing. Per-step Bitrix tests DO create real leads — surface a warning in the modal but don't try to add a "dry-run" mode (Bitrix has no such API).
- Saving the panel's pinned-state, multi-select, drag-and-drop tokens. v1 is click-to-insert.
- Replacing the `/runs/<id>` page. The historical view stays; the drawer is a shortcut.
- Modules wired to `notImplementedHandler`.
- Auth/OAuth changes.
- Worker / sync orchestrator.

---

## Sequencing

```
C.3.1 (sample API)  ─► C.3.2 (catalog) ─► C.3.3 (right rail)
C.3.4 (autoComplete fix) — independent, ship first
C.1.1 (testRunStep backend) ─► C.1.2 (modal button)
C.2.1 (drawer) ─► C.2.2 (verify shared card)
```

Suggested PR order (each ≤ ~250 LOC):

1. **PR1** — C.3.4 autoComplete fix + `name`/`spellCheck` on FieldMapper. ~30 LOC, ships standalone.
2. **PR2** — C.3.1 listSheetSample + C.3.2 upstream-catalog helper + unit tests.
3. **PR3** — C.3.3 UpstreamValuesPanel + StepConfigModal 2-col layout.
4. **PR4** — C.1.1 testRunStep procedure.
5. **PR5** — C.1.2 "Test this step" button + Last-test tab in StepConfigModal.
6. **PR6** — C.2.1 RunResultsDrawer + ScenarioDetailClient integration. C.2.2 verification.

---

## Acceptance for "done"

The user opens the running app and:

1. Adds a Sheets trigger and a Bitrix create_lead step. Saves.
2. Opens the Bitrix step config. The modal is **2-column**: form on the left, **values panel on the right** showing the trigger's actual sample row (id, name=Alice, email=alice@example.com).
3. Clicks the **`name = Alice`** row in the panel — `{{name}}` appears in whichever field had focus.
4. Types `Lead from {{name}}` in the title field. The token chip appears.
5. The phone field does **not** trigger browser autocomplete.
6. Clicks **"Test this step"** in the modal footer. After a few seconds, the modal's "Last test" tab opens showing Input panel (resolved config: `title = "Lead from Alice"`, etc.) + Output panel (lead URL).
7. Closes the modal, clicks **"Run once"** in BuilderHeader. A **bottom drawer slides up** with every step's Input + Output. No navigation away from `/scenarios/<id>`.
8. The "Last run" chip in BuilderHeader is unchanged — clicking it still jumps to `/runs/<id>` for the historical view.

If any of those fail, the initiative isn't done.

---

## Hand-off note for Codex

Run order:

1. Read this file end-to-end.
2. Read `CLAUDE.md`, `AGENTS.md`, `docs/MODULE_AUDIT.md` for hard rules and what's deferred.
3. Read `.product/zapier-modules/PLAN.md` for context on Phase A/B (already shipped).
4. Work through the PRs above in order. After each: `pnpm typecheck && pnpm lint && pnpm test` must pass before commit.
5. Stage + commit each PR locally on `phase-a-foundation`. Do **not** `git push`, `gh pr create`, or `railway up`. The user pushes from their own terminal.

Hard rules carried over:

- No `console.log`, untyped `any`, or `// @ts-ignore` without inline reason.
- All `app/api/**` routes touching Prisma/NextAuth/googleapis: `export const runtime = "nodejs"`.
- Never `Date.now()`/`Math.random()`/`crypto.randomUUID()` in `useMemo`/lazy `useState`/render bodies.
- Reuse existing tRPC procedures and components; don't duplicate.
- One logical change per commit. Imperative mood. Scope prefix (`scenarios:`, `runs:`, `sheets:`, `bitrix:`, `executor:`).
- Per-step test for Bitrix WILL create a real lead — surface a confirmation dialog before invoking `testRunStep` on a destination module.

Stop and ask the user only when:

- A module needs implementing that's listed as deferred in `MODULE_AUDIT.md`.
- typecheck / lint fail with errors that can't be fixed within the PR's file scope.
- A design detail is genuinely ambiguous after re-reading this plan and the Make.com reference screenshots in `local/`.
- Any PR would exceed ~300 LOC — split and describe the split.

Otherwise, execute without asking. This plan is authoritative.
