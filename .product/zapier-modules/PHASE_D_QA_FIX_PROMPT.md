# Goal — Full-stack QA of one canonical scenario, then fix every bug found

> Audience: Codex (executor). Claude planned. **You will do this in two passes: QA-find-all-bugs first, then fix in priority order (functionality before UI/UX). Do not skip the QA pass to start fixing — the bug list is the contract.**

---

## Read these first (in this order)

1. `.product/zapier-modules/PLAN.md` — Phase A/B scope
2. `.product/zapier-modules/PHASE_C_PLAN.md` — Phase C scope
3. `CLAUDE.md` + `AGENTS.md` — rules, runtime, OneDrive caveat
4. `docs/MODULE_AUDIT.md` — what's deferred
5. `docs/SMOKE_TEST.md` — the canonical happy-path
6. The user's reference screenshots in `local/` and `references/` — especially `local/update.png` (the bug they just spotted), `local/here.png` (Make.com), `references/module.png`, `references/scenario.png`

---

## The canonical test scenario (use this exact shape)

Name: **"Sheets→Bitrix smoke"**. Trigger + 1 action.

**Step 1 — Trigger: `trigger.watch.sheets_new_rows`**
- Spreadsheet: any Google Sheet from the user's Drive (the test uses "Test" — `1Pz-aZ84RdeEIXdlJZuCem08DifUu22buGHn8bWXZ4i8`)
- Tab: `Sheet1`
- Watch column: `id`

**Step 2 — Action: `bitrix.create_lead`**
- title: `Lead from {{name}}`
- name: `{{name}}`
- email: `{{email}}`
- phone: (empty literal)
- sourceId: `OTHER`
- comments: `Auto created — id={{id}}`

This shape exercises: Sheets cascade pickers, sample listing, token interpolation, Bitrix integration, run logging, all three test paths (whole scenario, per-step, /runs view), the inline drawer, the values panel, and the field mapper.

---

## Pass 1 — QA: find every bug. Do not fix yet. Output a bug list.

For each item below, exercise the code (read it OR script-probe it OR call the tRPC procedure via a temporary `pnpm tsx --conditions react-server scripts/qa-<name>.ts` script) and record:
- **Pass / Fail** with one-line evidence
- If Fail: **exact symptom** (error message, wrong output, missing element) and the **root cause file:line** if findable

Delete every QA probe script you create before final commit. Keep `scripts/verify-resources.ts` (already in repo).

### Functionality (backend / data flow / persistence) — test in this order

F1. **Auth + session**: visit `/`, redirected to `/login`. Sign in via Google. Land on `/connections`. Session cookie is `__Secure-authjs.session-token` (HTTPS). Verify by probing `/api/auth/session` returns user.

F2. **OAuth connections present in DB**: Google Sheets connection row + Bitrix24 connection row exist for the user with `status=CONNECTED`.

F3. **`connections.list` tRPC**: returns rows including provider + email + status.

F4. **`connections.googleSheetsResources`**: returns identifier + items (≤ 25 spreadsheets) + truncated flag.

F5. **`connections.bitrixPipelines`**: returns identifier (`Portal: yourco.bitrix24.com · User #1`) + items (≤ 25 deal categories + lead pipeline).

F6. **`connections.listSpreadsheets`**: returns ≥ 1 spreadsheet from Drive (read 200 items).

F7. **`connections.listSheetTabs({ spreadsheetId })`**: given a real ID, returns tabs sorted by index.

F8. **`connections.listSheetColumns({ spreadsheetId, tabName })`**: returns header row keys.

F9. **`connections.listSheetSample({ spreadsheetId, tabName, rowCount? })`**: returns `{ columns, rows }` with real row data. Verify rows[0] is a real row from the user's sheet, not the header repeated.

F10. **Scenario save**: create the canonical scenario via `scenarios.create` (or via UI). Verify the persisted `config` JSON matches the Record-shape contract: `mappedFields: Record<string,string>` and `triggers/sheets` configs round-trip. Re-fetch via `scenarios.getById` and confirm equality.

F11. **`scenarios.testRun` (whole scenario)**: invoke against the saved scenario. Confirm a `Run` row + 2 step `RunLog`s persist (one "Starting", one "Completed" per step). The trigger's "Completed" log has `sampleRows: [{ id, name, email, status }]` matching the sheet. The Bitrix step's "Completed" log has `leadId + leadUrl + interpolated config in inputConfig`. The lead actually appears in Bitrix24 (probe via `crm.lead.get?id=<id>`).

F12. **`scenarios.testRunStep` (per-step on the Bitrix step)**: invoke against the Bitrix step. Confirm: (a) NO new Run row created; (b) returned payload includes `{ inputConfig, inputSampleRows, outputSampleRows, rowCount, durationMs, leadUrl? }`; (c) the interpolated `title === "Lead from <actualName>"` from the upstream sample; (d) per the PHASE_C_PLAN, this DOES create a real Bitrix lead — confirm the lead exists in Bitrix.

F13. **Backwards-compat coercion**: take an old-shape config `{ mappedFields: ["name","email"] }` and run it through the handler. Confirm `normalizeMappedFields` coerces it to `{ name: "", email: "" }` and the handler falls back to upstream copy (no crash).

F14. **Token interpolation edge cases**: `{{name}}` resolves to the upstream value. `{{missing_key}}` resolves to empty string (no crash). `Lead {{a}} and {{b}}` interpolates both. Trailing whitespace inside `{{ name }}` resolves. Mixed literal + token works.

F15. **Empty upstream**: if the watch trigger returns 0 rows, the Bitrix step exits cleanly with `rowCount: 0` and no Bitrix call.

F16. **Sheets sample for the right panel**: `buildUpstreamCatalog` walks upstream correctly. Trigger position 1 means Bitrix step gets `prevStepOutputColumns` from the trigger's Sheets config. Real values flow through (not just column names).

F17. **Worker doesn't interfere**: `WORKER_ENABLED=false` on web service. Worker only runs on the worker service. Confirm no race / duplicate writes.

F18. **OAuth refresh**: simulate an expired Google token. `getAuthedClient` refreshes proactively. New tokens encrypted + persisted.

F19. **Module catalog vs handler parity**: every `ModuleType` listed in `src/lib/modules.ts` has a handler in `src/server/core/module-handlers.ts`. Deferred ones map to `notImplementedHandler`. No silent mocks.

F20. **`validateStepConfig`**: returns errors when:
  - sheets.append: empty `mappedFields` Record
  - sheets.upsert: empty `mappedFields` OR empty `keyFields`
  - sheets.update_row: empty `mappedFields` OR empty `rowIdentifier`
  - bitrix.create_lead: empty required text fields

### UI/UX — only test after the Functionality bug list is captured

U1. **`/connections` page**: 3 cards (Google, FB, Bitrix). Google card shows "Connected as <email>" + spreadsheet list (or error+Reconnect if scope missing). Bitrix card shows portal identifier + pipeline list (or empty). FB card shows display name + ad accounts (or Connect button).

U2. **`/scenarios/new`**: empty canvas, "Add trigger" affordance. Adding a Watch Sheets trigger renders a step card with brand icon + `module.shortName` subtitle ("Watch new rows").

U3. **Trigger step config modal**:
  - Title shows brand icon + "Google Sheets · Watch new rows"
  - Configure / Sample / Last test tabs
  - Cascade: Spreadsheet dropdown lists real spreadsheets → picking one populates Tab dropdown → picking a tab populates Watch column dropdown
  - "Connected as <email>" caption visible
  - Reset semantics: change spreadsheet → tab + column visibly clear

U4. **Add a Bitrix step. Open its config**:
  - Modal is 2-column at ≥ lg (55/45)
  - Modal max-width ≤ 1200px
  - Right panel shows "VALUES FROM PREVIOUS STEPS" with search input + magnifier icon + helper text
  - Watch Sheets module section has bold red-700 header + brand icon
  - Green chip cloud below header — real upstream columns from the trigger
  - Below `lg:` the panel collapses to a tab

U5. **FieldMapper inputs**:
  - No browser-native autocomplete on phone field
  - No chip strip above labels
  - Click "+" popover hidden when right panel is visible (at `lg:`)
  - Click chip in panel → `{{key}}` inserts at focused field
  - **Drag a chip onto a field** → field shows emerald outline ring → release → token inserts at cursor position
  - Multiple tokens compose into one string: `Lead {{name}} from {{email}}`

U6. **Per-step "Test this step" button**: visible in modal footer, disabled while validation errors present, opens a confirmation dialog warning about real side effects (Bitrix creates a real lead). Confirm → spinner → switches to "Last test" tab with Input panel (resolved config table + upstream sample row table) + Output panel (rowCount + clickable Bitrix lead URL chip).

U7. **"Run once" button**: in `BuilderHeader`. Always visible. Disabled while saving / pending validation. Click → inline run + drawer slides up from bottom.

U8. **Inline `RunResultsDrawer`**:
  - Slides up after Run once
  - 160px collapsed; drag (or button) to expand to ~50vh
  - Each step has Input + Output `<details open>` panels with table layout
  - "Open full run" link jumps to `/runs/<id>`
  - "Last run" chip in BuilderHeader updates with status + relative time

U9. **`/runs/<id>` standalone page**: same Input/Output panels as the drawer. Reuses `StepResultCard`. Bitrix lead URL is a clickable chip. Sample rows are tables (not raw JSON).

U10. **Canvas polish (Phase B PR7)**:
  - Step cards: brand icon tile + numeric badge (1, 2) at top-right of icon
  - Dotted connector line between steps
  - `module.shortName` subtitle line under step title

U11. **Empty / loading / error states across every list**:
  - Drive list while loading shows skeleton chips
  - Drive list error shows retry button + "Reconnect" link to /connections
  - Empty spreadsheet (no shared files) shows guidance copy
  - Right panel "No matches" when search yields zero

U12. **Mobile / narrow modal** (resize to < 900px):
  - Modal becomes single-column
  - Values panel collapses into a tab labeled "Values from previous steps"
  - "+" popover reappears as fallback

U13. **Dark mode**: toggle via theme switcher (if present). All panels, chips, drop rings render correctly in both modes. No invisible text.

U14. **Keyboard navigation**:
  - Tab through chips in the values panel — each chip is a `<button>` with focus ring
  - Enter / Space inserts the focused chip's token
  - Tab order: search → chips → form fields

U15. **Accessibility**:
  - All inputs have associated `<label>` or `aria-label`
  - Modal traps focus
  - Escape closes modal (does not save accidentally if unsaved)
  - Screen reader announces "Draggable" hint on chips

---

## Pass 2 — Fix the bugs in priority order

Once Pass 1 produces a bug list, fix in this order:

1. **Critical functionality bugs** — anything that produces wrong data, fails silently, or breaks persistence
2. **High functionality bugs** — anything that errors in normal use
3. **Medium functionality bugs** — edge cases, empty states, validation
4. **Critical UI/UX** — broken layout, unreadable text, dark mode failures
5. **High UI/UX** — missing affordances, confusing copy
6. **Medium UI/UX** — polish, spacing, micro-animations

Each fix is its own PR (commit). Imperative mood. Scope prefix (`sheets:`, `bitrix:`, `executor:`, `scenarios:`, `runs:`, `connections:`).

After each fix: `pnpm typecheck && pnpm lint && pnpm test` must pass. If a fix changes runtime behavior, **add or update a test** to cover it.

---

## Hard rules (carried over)

- No `console.log`, untyped `any`, `// @ts-ignore` without reason comment.
- No new dependencies.
- Tailwind only.
- All 4 UX states wired wherever applicable.
- Modules in `notImplementedHandler` — don't implement them.
- Don't touch `worker/`, `src/server/sync/`, `src/server/sheets/poller.ts`, deploy configs, auth/OAuth refresh logic.
- One logical change per commit.

---

## Hand-off

Stage + commit each fix locally on branch `phase-a-foundation`. Do **not** `git push`, `gh pr create`, or `railway up`. The user pushes from their own terminal.

**Final report format:**

1. **Bug ledger** — full list from Pass 1, with status (open/fixed/deferred). Group by section (F1–F20, U1–U15).
2. **Fix PR summary** — one bullet per commit, in the order they landed.
3. **Hard QA evidence** — for each Critical/High functionality bug, paste the BEFORE symptom and the AFTER probe-script or test output proving the fix.
4. **Anything deferred** — if a bug is intentionally not fixed (e.g. requires schema migration), explain.

Cap the report at ~800 words. Quality of evidence matters more than length.

**The user will reject any "done" claim that lacks hard evidence.** They've been burned by typecheck-passes-but-runtime-is-broken claims twice this session. Probe scripts that exercise the real runtime path are the gold standard.
