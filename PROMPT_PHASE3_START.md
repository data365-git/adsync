# Kickoff Prompt — Phase 3 — paste this into a fresh Claude Code session

> Copy everything inside the fenced block below. Paste it as the first message in a fresh session. The rest of this file is documentation — do not paste it.

---

```
You are the orchestrator for Phase 3 of the Automation Dashboard inside this repo:

  C:\Users\saman\OneDrive\Documents\data-365-projects\automation

Phase 2 is partially complete, tagged phase-2-partial on branch phase-2.
Phase 3 is UI-only: a third integration (Bitrix24, fully mocked), 13 new module
config forms, iterator badge UI, Watch trigger category, and expanded module
library. No real APIs. No executor changes. No worker changes.

Your first job is to read these two files in full before doing anything else:

  1. CLAUDE.md                   — project map, ownership, rules
  2. PROMPT_PHASE3_BUILD.md      — full Phase 3 playbook (Stage 0', Stage 1', Stage 2')

After reading both, verify the starting state:

  git describe --tags --abbrev=0
  # MUST output: phase-2-partial
  # If it does not, ABORT immediately. Do not proceed until confirmed.

  git branch --show-current
  # If already on phase-3-ui, skip branch creation below.
  # If on phase-2 (or main), create the branch now.

If the tag is present, execute Stage 0' ONLY:

  0'.1  Verify tag phase-2-partial; checkout phase-2; create branch phase-3-ui
  0'.2  Edit prisma/schema.prisma — add BITRIX24 to Provider enum
        Run: pnpm prisma migrate dev --name add_bitrix24_provider
        Run: pnpm prisma generate
  0'.3  Edit src/styles/globals.css — add inside existing @theme {} block:
          --color-bitrix-cyan: #2FC6F6;
          --color-watch-violet: #8b5cf6;
        Do NOT create a new @theme block. Append inside the existing one.
  0'.4  Edit src/lib/integration-icons.tsx — add BitrixIcon, WatchIcon exports,
        extend IntegrationTone union, extend getIntegrationMeta() for bitrix.*
        and trigger.watch.* prefixes. Full code in PROMPT_PHASE3_BUILD.md 0'.4.
  0'.5  Edit src/server/mocks/types.ts — remove 'fb.account_insights' from
        ModuleType union; add 15 new IDs (13 modules + 2 triggers); add
        outputsArray?: boolean to the definition type.
  0'.6  Edit src/lib/modules.ts — add 13 new module entries + 2 trigger entries
        (all with id, name, shortName, description, group, outputsArray,
        configSchema, sampleOutput). Full content in PROMPT_PHASE3_BUILD.md 0'.6.
        Modules with outputsArray: true MUST have sampleOutput with 3 rows.
        Do NOT remove the existing fb.account_insights registry entry.
  0'.7  Edit src/server/mocks/data.ts — add Bitrix24 OAuthConnection row for
        user_01 with status DISCONNECTED; migrate any fb.account_insights step
        references to fb.ad_insights.
  0'.8  Edit src/server/api/routers/connections.ts — extend z.enum to include
        'bitrix'; add redirectUrl case for 'bitrix' -> /api/oauth/bitrix.
  0'.9  Create src/app/api/oauth/bitrix/route.ts (mock initiator — no external calls)
        Create src/app/api/oauth/bitrix/callback/route.ts (mock callback — upserts
        OAuthConnection with encryptToken, redirects to /connections?success=bitrix)
        Full code for both files in PROMPT_PHASE3_BUILD.md 0'.9.
  0'.10 Run:
          pnpm prisma generate
          pnpm typecheck   # must exit 0
          pnpm lint        # must exit 0
        Git add the changed files and commit:
          "phase 3 stage 0': bitrix24 enum + brand tokens + modules registry +
           mock OAuth + type unions + mock data migration"

STOP after the Stage 0' commit. Report back immediately. Do NOT spawn subagents.
Do NOT proceed to Stage 1'.

Report back:

  - Files created/modified (absolute paths)
  - pnpm typecheck: pass/fail (show first error if fail)
  - pnpm lint: pass/fail
  - Migration applied: yes/no (show migration filename)
  - Confirm src/styles/globals.css @theme{} has bitrix-cyan and watch-violet tokens
  - Confirm src/lib/integration-icons.tsx exports BitrixIcon, WatchIcon
  - Confirm src/lib/modules.ts has entries for bitrix.create_lead, fb.list_ads,
    sheets.find_rows, trigger.watch.sheets_new_rows (spot-check 4 of the 15)
  - Confirm src/server/mocks/types.ts no longer has 'fb.account_insights'
  - Confirm src/app/api/oauth/bitrix/route.ts exists
  - Confirm src/app/api/oauth/bitrix/callback/route.ts exists
  - Confirm pnpm dev starts without errors (show first 5 lines of boot output)

If anything fails, STOP and surface the exact error. Do not retry destructively.
Especially: do NOT run pnpm db:reset without explicit human confirmation (it
destroys the Postgres volume and nukes the seeded Google Sheets token).

One checkpoint before Stage 1' is authorised:

  CHECKPOINT: Stage 0' commit verified + human replies "go Stage 1"

Do NOT begin Stage 1' until that exact phrase is received in the current turn.

Phase 3 constraints (these override CLAUDE.md base rules where they conflict):

  - UI only. No real API calls to Bitrix24, Facebook, or Google.
  - No executor changes. No worker changes. No src/server/core/* edits.
  - Bitrix24 OAuth routes are mock-only. Real OAuth is Phase 4.
  - No watch-trigger polling logic in the worker. Forms only.
  - No new npm dependencies without asking.
  - No any type. No // @ts-ignore without a one-line reason.
  - No console.log in committed code.
  - Tailwind tokens live in src/styles/globals.css NOT src/app/globals.css.
  - shadcn primitives: render={<X />} pattern, NOT asChild.
  - next-themes ThemeProvider is a black box — do NOT touch.
  - node_modules lives inside OneDrive — do NOT delete or recreate it.
  - pnpm 9.15.9 pinned. Node 22.14.
  - Starting commit: phase-2-partial tag on branch phase-2. ABORT if not found.
```

---

## Why this prompt is short

The full playbook is in `PROMPT_PHASE3_BUILD.md` (~1700 lines). This kickoff does three things only:

1. Points the orchestrator at the two files it must read.
2. Authorises **Stage 0' only** — bounded scope, ~30 minutes. Smaller than Phase 2's Stage 0' because there is no Docker setup, no dep install, no seed script — just schema migration + CSS tokens + registry expansion + mock routes.
3. Hard-stops at a single checkpoint (Stage 0' verified + human "go Stage 1") before dispatching 3 parallel subagents.

---

## How to Use It

1. Open a fresh Claude Code session in `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`.
2. Paste the fenced block above as the first message.
3. Wait for the Stage 0' report.
4. Verify manually using the checklist below.
5. Reply to the session: `go Stage 1`

---

## What to Verify After Stage 0'

**Schema:**
```powershell
# Confirm migration ran
Get-ChildItem prisma\migrations | Where-Object { $_.Name -match "bitrix24" }
# Expected: a folder like 20250511xxxxxx_add_bitrix24_provider

# Confirm BITRIX24 is in the schema
Select-String "BITRIX24" prisma\schema.prisma
# Expected: one match on the enum line
```

**Tailwind tokens:**
```powershell
Select-String "bitrix-cyan" src\styles\globals.css
Select-String "watch-violet" src\styles\globals.css
# Expected: one match each inside @theme {} block
```

**Integration icons:**
```powershell
Select-String "BitrixIcon" src\lib\integration-icons.tsx
Select-String "WatchIcon" src\lib\integration-icons.tsx
# Expected: one export each
```

**Modules registry:**
```powershell
Select-String "bitrix.create_lead" src\lib\modules.ts
Select-String "fb.list_ads" src\lib\modules.ts
Select-String "trigger.watch.sheets_new_rows" src\lib\modules.ts
# Expected: matches in sampleOutput and configSchema entries
```

**Type union — no account_insights:**
```powershell
Select-String "fb.account_insights" src\server\mocks\types.ts
# Expected: no matches (it was removed)
```

**Mock OAuth routes:**
```powershell
Test-Path "src\app\api\oauth\bitrix\route.ts"        # True
Test-Path "src\app\api\oauth\bitrix\callback\route.ts" # True
```

**Dev server:**
```powershell
# pnpm dev should boot without errors
# Navigate to http://localhost:3000/connections
# Should see Google Sheets and Facebook cards (Bitrix24 card is Stage 1' work)
```

**Quality gates:**
```powershell
pnpm typecheck   # exits 0
pnpm lint        # exits 0
```

If all checks pass, reply `go Stage 1` to the orchestrator session.

---

## What "go Stage 1" Triggers

Sending `go Stage 1` authorises the orchestrator to dispatch 3 parallel subagents in separate git worktrees. Estimated concurrent work: 4–5 hours.

The orchestrator will run:
```powershell
git worktree add .worktrees/forms   phase3/module-forms
git worktree add .worktrees/bitrix  phase3/bitrix-brand
git worktree add .worktrees/builder phase3/builder-iterators
```

Then dispatch all 3 agents simultaneously:

```
Dispatch all 3 subagents from Stage 1' of PROMPT_PHASE3_BUILD.md, each in its
own git worktree as specified. Run all 3 in parallel.

Worktrees:
  .worktrees/forms   -> phase3/module-forms     (Agent A - module config forms)
  .worktrees/bitrix  -> phase3/bitrix-brand     (Agent B - connections + Bitrix24 card)
  .worktrees/builder -> phase3/builder-iterators (Agent C - iterator UI + library)

After all 3 agents commit their branches, run Stage 2' (merge in order: forms ->
bitrix -> builder, pnpm typecheck after each merge, then full quality gate,
smoke test, axe check, Lighthouse, screenshots, tag phase-3-ui-done).

Stop and report after Stage 2' is tagged.

If any subagent fails or stalls, STOP and surface the failure before merging.
Do not partial-merge. Do not auto-retry destructively.
```

---

## Subagent Ownership Summary

| Agent | Worktree | Branch | Primary scope |
|---|---|---|---|
| `Module-Forms-Agent` (A) | `.worktrees/forms` | `phase3/module-forms` | 14 new `*Config.tsx` files + `MODULE_CONFIG_MAP` entries in `StepCard.tsx` |
| `Bitrix-Brand-Agent` (B) | `.worktrees/bitrix` | `phase3/bitrix-brand` | `BitrixConnectionCard.tsx`, 3-CTA empty state, toast strings, provider routing in `ConnectionCard.tsx` |
| `Builder-Iterators-Agent` (C) | `.worktrees/builder` | `phase3/builder-iterators` | `IteratorBadge.tsx`, `stepUtils.ts`, Watch trigger configs, `ModuleLibraryModal.tsx` sections, `FieldMappingPicker.tsx` prefix, `TestRunPanel.tsx` copy, `ModuleConfigShell.tsx` badge, renderer wrapper in `StepCard.tsx` |

**Critical merge-order constraint:** Agent A (module-forms) must merge first, Agent B (bitrix-brand) second, Agent C (builder-iterators) last. The reason: Agent C touches the renderer wrapper in `StepCard.tsx` which must see Agent A's `MODULE_CONFIG_MAP` entries already present to avoid a conflict.

**Crash-safety note on StepCard.tsx:** Agents A and C both edit this file. They own disjoint sections — A owns the `MODULE_CONFIG_MAP` object and its imports; C owns the renderer wrapper that reads from the map. If a conflict occurs at merge time, A's map entries win; C must not have touched the map.

Full per-agent definitions (file lists, ASCII mockups, acceptance criteria) are in `PROMPT_PHASE3_BUILD.md` Stage 1'.

---

## Common Stage 0' Failures

| Symptom | Likely cause | Fix |
|---|---|---|
| `git describe` does not show `phase-2-partial` | Phase 2 partial branch was not tagged | Run `git log --oneline -10` to confirm the branch state; if Phase 2 work is present but untagged, ask the user — do NOT tag manually without confirmation |
| `pnpm prisma migrate dev` fails with "port refused" | Postgres container not running | Run `pnpm db:up` (starts Docker Compose); wait 5s; retry migrate |
| `pnpm prisma migrate dev` fails with "migration name already exists" | A previous failed attempt left a partial migration | Use `--name add_bitrix24_provider_v2` as the migration name |
| `pnpm prisma generate` fails with enum type error | Prisma client is stale | Ensure migrate dev completed first; then run generate |
| `pnpm typecheck` fails with "Property 'outputsArray' does not exist on type" | `outputsArray?: boolean` was not added to the module definition type | Edit `src/server/mocks/types.ts` to add the field; re-run typecheck |
| `pnpm typecheck` fails on `integration-icons.tsx` with "Property 'tone' is never 'bitrix-cyan'" | `IntegrationTone` union not extended | Add `'bitrix-cyan' \| 'watch-violet'` to the union in the same file |
| Tailwind does not pick up `bg-bitrix-cyan` | Token is in wrong file or not inside `@theme {}` | Confirm it is in `src/styles/globals.css` (not `src/app/globals.css`) and inside (not after) the `@theme {}` block |
| `src/app/api/oauth/bitrix/callback/route.ts` typecheck fails on `db.oAuthConnection` | Prisma model name casing mismatch | Read the generated Prisma client — it may be `db.oAuthConnection` or `db.oauthConnection`; match exactly |
| `pnpm db:seed:mock` fails after migration | Seed script uses old Provider enum values | Do NOT run seed in Stage 0'; it is not required. The migration alone is sufficient. |
| `pnpm db:reset` prompt from orchestrator | Orchestrator proposed resetting the DB | DO NOT allow without explicit human confirmation — this destroys the seeded Google Sheets OAuth token. |

---

## Don't Paste the Playbook

`PROMPT_PHASE3_BUILD.md` is **read by the agent via the filesystem**, not pasted by you. The agent has Read access to it via the working directory. Pasting the playbook content into the chat wastes context and achieves nothing extra.

---

## Phase 3 in Context

```
Phase 1   (done) — UI scaffold, mock data, 7 modules
Phase 1.5 (done) — Scenario builder, 3 templates
Phase 1.6 (done) — Zapier-quality UI refresh, cron builder
Phase 2   (partial, phase-2-partial) — Real auth, real DB, Google Sheets OAuth live
Phase 3   (THIS) — Bitrix24 mock, 13 new modules, iterator UI, Watch triggers
Phase 4   (next) — Real Bitrix24 OAuth + API, FB list/get APIs, real Sheets CRUD, real watch polling
```

Phase 3 produces no new real integrations — it lays the UI and registry groundwork so Phase 4 can wire real APIs into already-finished config forms without touching any UI code.
