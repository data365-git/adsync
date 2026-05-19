# Goal

Implement Phase C of the Zapier/Make-style modules: per-step test runs, inline run results on the scenario page, and a Make-style upstream values panel — exactly as specified in `.product/zapier-modules/PHASE_C_PLAN.md`. Builds on Phase A/B (already shipped, commits `2b33d56…42b52d2`).

---

## Read these files first, in this order

1. `.product/zapier-modules/PHASE_C_PLAN.md` — canonical Phase C plan: 3 epics, 6 PRs, sequencing, acceptance.
2. `.product/zapier-modules/PLAN.md` — Phase A/B context for what's already built.
3. `CLAUDE.md` — runtime rules, stack, house rules, OneDrive caveat.
4. `AGENTS.md` — Codex-facing mirror.
5. `docs/MODULE_AUDIT.md` — deferred modules; don't touch.
6. Reference images at `local/values.png` (our current FieldMapper, showing browser autocomplete bug) and `local/here.png` (Make.com reference — the target UX).

Do not start coding until you have read all six.

---

## What success looks like

1. Open Bitrix create_lead config in a Sheets→Bitrix scenario. Modal is 2-column: form left, **values panel right** showing trigger's actual sample row (`id=1`, `name=Alice`, `email=alice@example.com`).
2. Click `name = Alice` row → `{{name}}` inserted at focused field.
3. Phone field does **not** trigger browser autocomplete popup.
4. Click **"Test this step"** in modal footer → "Last test" tab shows Input (resolved config) + Output (Bitrix lead URL) without leaving modal.
5. Click **"Run once"** in BuilderHeader → **bottom drawer slides up** with every step's Input + Output. No navigation.
6. "Last run" chip still links to `/runs/<id>` for historical view.

---

## PR sequence (≤ ~250 LOC each, in order)

**PR1** — Fix browser autocomplete in FieldMapper. `src/components/scenarios/builder/modules/FieldMapper.tsx` — add `autoComplete="off"`, `spellCheck={false}`, unique `name` attr on Input + textarea. ~30 LOC. Ships standalone.

**PR2** — Sample-bearing API + upstream catalog helper.
- Backend: add `connections.listSheetSample({ spreadsheetId, tabName, rowCount? })` → `{ columns, rows }` reading `A1:ZZ${rowCount+1}`. Add to `src/server/api/routers/connections.ts`.
- New file: `src/components/scenarios/builder/upstream-catalog.ts` exporting `buildUpstreamCatalog(steps, currentPosition, sheetSample?)`.
- Tests: `__tests__/upstream-catalog.test.ts` covering Sheets trigger upstream + FB insights upstream cases.

**PR3** — Right-rail values panel. New `src/components/scenarios/builder/UpstreamValuesPanel.tsx`. Modify `StepConfigModal.tsx` to render 2-column layout (70/30) when not on a trigger step. Shared focus-tracking via `UpstreamValuesContext`. Mobile fallback: collapse panel into a tab labeled "Values from previous steps" below 900px modal width. FieldMapper updated to register itself as focused mapper.

**PR4** — Per-step test backend. Add `scenarios.testRunStep({ scenarioId, stepId })` `authedProcedure.mutation` in `src/server/api/routers/scenarios.ts`. Strategy: execute steps `1..N` where N is the requested step's position, return Nth step's log shape `{ inputConfig, inputSampleRows, outputSampleRows, rowCount, durationMs, error?, leadUrl? }`. Do NOT write a `Run` row.

**PR5** — "Test this step" button + Last-test tab. In `StepConfigModal.tsx`: add button in footer (disabled for trigger / for steps with validation errors), wire `scenarios.testRunStep.useMutation`, add 3rd "Last test" tab beside Configure/Sample showing the most recent test result. Confirmation dialog before testing a destination module (Bitrix steps create real records).

**PR6** — Inline run results drawer. New `src/components/scenarios/builder/RunResultsDrawer.tsx`. Modify `src/app/(dashboard)/scenarios/[id]/ScenarioDetailClient.tsx` to render the drawer after Run once. Bottom-anchored, 160px collapsed, 50vh expanded. Re-uses `StepResultCard` from `src/components/runs/StepResultCard.tsx`. "Open full run" link jumps to `/runs/<id>`. Verify `StepResultCard` renders identically from both routes.

After each PR: `pnpm typecheck && pnpm lint && pnpm test` must pass before commit.

---

## Hard rules — no exceptions

- No `console.log`, untyped `any`, or `// @ts-ignore` without inline reason comment.
- Every new `app/api/**` route touching Prisma/NextAuth/googleapis: `export const runtime = "nodejs"`.
- Never `Date.now()`, `Math.random()`, `crypto.randomUUID()` inside `useMemo` / lazy `useState` / render bodies.
- Reuse existing tRPC procedures (`connections.listSpreadsheets`, `listSheetTabs`, `listSheetColumns`) — don't duplicate.
- One logical change per commit. Imperative mood. Scope prefix: `scenarios:`, `runs:`, `sheets:`, `bitrix:`, `executor:`.
- Per-step test of destination modules WILL create real external records. Surface a confirmation dialog before invoking `testRunStep` on Bitrix steps.
- `pnpm typecheck && pnpm lint && pnpm test` must pass before each commit.

---

## Do NOT touch

- `src/server/sync/orchestrator.ts`, `src/server/sheets/poller.ts` (worker sync path).
- Modules wired to `notImplementedHandler` (`fb.list_ads`, `fb.get_ad`, `sheets.delete_row`, `sheets.get_row`, `sheets.create_tab`, `sheets.watch_new_rows`, `bitrix.find_leads`, `bitrix.create_deal`, `bitrix.update_deal`).
- Auth/OAuth flow.
- `railway.json`, `railway.worker.json`, deploy configs.

---

## Stop and ask the user only when

- A task requires implementing a deferred module.
- typecheck / lint fail with errors that cannot be fixed within the PR's file scope.
- A design detail is genuinely ambiguous after re-reading PHASE_C_PLAN and the reference screenshots.
- A PR would exceed ~300 LOC — split it and describe the split.

Otherwise, execute without asking. PHASE_C_PLAN is authoritative.

---

## Hand back

Stage + commit each PR locally on branch `phase-a-foundation`. Do **not** `git push`, `gh pr create`, or `railway up`. The user pushes from their own terminal after reviewing. After all 6 PRs commit, update `docs/SMOKE_TEST.md` with the new test-this-step + inline-drawer flows.
