# Goal

Implement Zapier/Make-style scenario modules for the `adsync` app: run-result I/O panels, field mapping with token interpolation, live Sheets pickers, and UX polish — exactly as specified in `.product/zapier-modules/PLAN.md`.

---

## Read these files first, in this order

1. `.product/zapier-modules/PLAN.md` — canonical plan: 4 epics, 7 PRs, sequencing, acceptance criteria. Authoritative spec.
2. `CLAUDE.md` — runtime rules, stack, house rules, OneDrive caveat.
3. `AGENTS.md` — Codex-facing mirror of CLAUDE.md.
4. `docs/MODULE_AUDIT.md` — which modules are real vs `notImplementedHandler`; do not touch deferred modules.
5. `docs/SMOKE_TEST.md` — canonical smoke flow; update if new steps are needed after all PRs.

Do not start coding until you have read all five files.

---

## What success looks like

1. `Watch Sheets — New Rows` trigger shows real spreadsheet dropdowns (not text inputs), cascading to tab then column.
2. Bitrix `create_lead` step shows every string field with a "+" token button listing upstream sheet columns; `{{Name}}`-style tokens persist.
3. "Run once" completes a run.
4. `/runs/<id>` shows Input + Output panels per step; Bitrix Input panel shows interpolated `title = "Lead from Alice"`.

---

## PR sequence (≤ 250 LOC each, in order)

**PR1** — Executor input logging. `src/server/core/executor.ts`, `run-context.ts`. Log `inputConfig` + `inputSampleRows` on "Starting step" RunLog.

**PR2** — Sheets pickers in trigger. `WatchSheetsNewRowsConfig.tsx` cascade, audit `SheetsFindRowsConfig` + `SheetsUpdateRowConfig`, "Connected as <email>" caption. Skip `notImplementedHandler` modules.

**PR3** — Token interpolation. New `src/server/core/template.ts` (`interpolate`, `pickTokens`) + tests. Wire executor to interpolate string config fields against upstream row 0 before each handler.

**PR4** — FieldMapper + bitrix.create_lead + modal wiring. New `FieldMapper.tsx` with "+" popover; wire into `BitrixCreateLeadConfig.tsx`; have `StepConfigModal` feed `prevStepOutputColumns` from upstream Sheets step (fallback to module `sampleOutput[0]`).

**PR5** — FieldMapper across remaining Bitrix modules: `BitrixUpdateLead`, `BitrixCreateDeal`, `BitrixUpdateDeal`, `BitrixCreateSmartProcessItem`.

**PR6** — `StepResultCard.tsx` split into Input/Output table panels. `StepCard.tsx` adds `module.shortName` subtitle.

**PR7** — UX polish: modal header (icon + name + submodule), numeric badge + dotted connector on canvas, fixed "Run once" + last-run chip in `BuilderHeader.tsx`.

After each PR: `pnpm typecheck && pnpm lint && pnpm test` must pass before commit.

---

## Hard rules — no exceptions

- No `console.log`, untyped `any`, or `// @ts-ignore` without inline reason.
- Every new `app/api/**` route touching Prisma/NextAuth/googleapis: `export const runtime = "nodejs"`.
- Never `Date.now()`, `Math.random()`, `crypto.randomUUID()` inside `useMemo` / lazy `useState` / render bodies.
- Auth.js v5 cookie name: `__Secure-authjs.session-token` (HTTPS) or `authjs.session-token` (HTTP).
- OAuth redirect base: `process.env.NEXTAUTH_URL ?? req.url` — never `req.url` alone.
- OneDrive: ensure `node_modules` junction to `C:\dev\node-modules-cache\automation` before any install.
- Reuse `connections.listSpreadsheets`, `listSheetTabs`, `listSheetColumns` — don't duplicate.
- Cascade resets: spreadsheet change clears tab + column; tab change clears column.
- One logical change per commit. Imperative mood. Scope prefix: `runs:`, `scenarios:`, `sheets:`, `bitrix:`, `executor:`.

---

## Do NOT touch

- `src/server/sync/orchestrator.ts`, `src/server/sheets/poller.ts` (worker sync path).
- Any `notImplementedHandler` module.
- Auth/OAuth refresh logic.
- `railway.json`, `railway.worker.json`, deploy configs.

---

## Stop and ask the user only when

- A task requires implementing a module listed as deferred in `MODULE_AUDIT.md`.
- `pnpm typecheck` / `pnpm lint` fail with errors you cannot fix within the PR's file scope.
- A design detail is genuinely ambiguous after re-reading the plan.
- A PR would exceed ~300 LOC — split it and describe the split.

Otherwise, execute without asking. The plan is authoritative.

---

## Hand back

Stage + commit each PR locally on branch `phase-a-foundation`. Do **not** `git push`, `gh pr create`, or `railway up`. The user will push from their own terminal after reviewing. After all 7 PRs commit, run the smoke flow in `docs/SMOKE_TEST.md` and update it if new run-detail steps are needed.
