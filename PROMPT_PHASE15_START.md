# Kickoff Prompt — Phase 1.5 — paste this into a fresh Claude Code session

> Copy everything inside the fenced block below. Paste it as the first message in a fresh session. The rest of this file is documentation — do not paste it.

---

```
You are the orchestrator for Phase 1.5 of the Automation Dashboard inside this repo:

  C:\Users\saman\OneDrive\Documents\data-365-projects\automation

Phase 1 is complete and committed at main, commit 12bc7bd. Phase 1.5 adds a
Zapier-linear scenario builder (UI only, mocks, no real APIs) on top of it.

Your first job is to read these two files in full, in order, before doing anything else:

  1. CLAUDE.md                  — project map, ownership, rules, Do/Don't
  2. PROMPT_PHASE15_BUILD.md    — full Phase 1.5 playbook (Stage 0', Stage 1', Stage 2')

After reading both, execute Stage 0' ONLY:

  - Confirm you are on main at commit 12bc7bd before doing anything else
  - Create branch phase-1.5 from main
  - Update src/server/mocks/types.ts (additive only — do NOT break existing types)
  - Update src/server/mocks/data.ts (add 3 QUICK_SETUP + 4 CUSTOM scenarios, backfill scenarioId on all 30 runs)
  - Update src/server/api/root.ts (add scenariosRouter and modulesRouter)
  - Add src/lib/modules.ts (7-module registry with config schemas and sampleOutput)
  - Add src/lib/scenario-templates.ts (3 template factory functions)
  - Update src/components/layout/Sidebar.tsx (add Scenarios link — one-time edit, then re-frozen)
  - Update src/components/runs/RunsTable.tsx or RunRow.tsx (add Scenario column — one-time edit, then re-frozen)
  - Update src/components/runs/detail/RunMetadataGrid.tsx (add Scenario cell — one-time edit, then re-frozen)
  - Update src/components/ad-accounts/form/AdAccountForm.tsx (add comment-marked Phase 1.5 note in save handler — one-time edit, then re-frozen)
  - Run pnpm typecheck and pnpm lint — fix all errors
  - Commit with message: "phase 1.5 stage 0': scenarios baseline (mocks, routers, sidebar, runs column)"

STOP after the Stage 0' commit. Do NOT spawn subagents. Do NOT begin Stage 1'.

Report back:

  - Files modified/created (list them)
  - pnpm typecheck and pnpm lint: pass/fail summary
  - Any deviations from PROMPT_PHASE15_BUILD.md and why
  - Confirm the dev server boots without errors (pnpm dev)
  - Confirm the sidebar shows the new "Scenarios" link
  - Confirm /runs table now shows a Scenario column
  - Confirm /scenarios returns a 404 (expected — the page is not built yet)

If anything fails, STOP and surface the error verbatim. Do not retry destructively.

Constraints (these are Phase 1.5 specific — read CLAUDE.md for the base rules):

  - Phase 1.5 is UI-only with mock data. No real APIs, no Prisma, no real scheduling.
  - Do NOT add new npm dependencies without asking first.
  - shadcn primitives are Base UI, NOT Radix. Use render={<X />}, NOT asChild.
  - Tailwind v4 — tokens via @theme in globals.css, no tailwind.config.ts extension.
  - No next/font/google import (verbatimModuleSyntax breaks it — system-ui is already wired).
  - next-themes ThemeProvider is already wired with React.createElement workaround — do NOT touch it.
  - NuqsAdapter is already in root layout — agents may use nuqs freely.
  - node_modules lives inside OneDrive — do not delete or recreate it.
  - pnpm 9.15.9 (pinned), Node 22.14.
  - Frozen files during Stage 1' (after Stage 0'): src/components/ui/*, src/components/layout/*,
    src/components/providers/*, src/server/api/root.ts, src/server/mocks/*, src/lib/*,
    src/app/(dashboard)/layout.tsx, src/app/(dashboard)/runs/*, src/app/(dashboard)/ad-accounts/*,
    src/components/runs/*, src/components/ad-accounts/*.
  - No any, no // @ts-ignore without comment, no console.log in commits.
  - No canvas/node-graph UI. Linear vertical step cards only (Zapier-style).

After Stage 0' is committed and verified, wait for the human to say "go Stage 1.5"
before dispatching subagents.
```

---

## Why this prompt is short

The full playbook is in `PROMPT_PHASE15_BUILD.md` (~500 lines). This kickoff does three things only:

1. Points the agent at the two files it needs to read.
2. Authorises **Stage 0' only** — bounded scope, ~15–20 minutes of sequential work.
3. Hard-stops after the Stage 0' commit so you can verify before parallel subagents start.

## How to use it

1. Open a fresh Claude Code session in `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`.
2. Paste the fenced block above as the first message.
3. Wait for the Stage 0' report.
4. Verify manually:

```powershell
cd C:\Users\saman\OneDrive\Documents\data-365-projects\automation
pnpm dev
# Navigate to http://localhost:3000 (or :3002 if 3000 is taken — read the boot output)
```

**Expected post-Stage-0' state:**

| What to check | Expected result |
|---|---|
| `/scenarios` | 404 — correct, the page component does not exist yet |
| Sidebar | Shows a new "Scenarios" link with Workflow icon, between Ad Accounts and Runs |
| `/runs` table | Has a new "Scenario" column before the "Account" column; Quick badge visible on quick-setup rows |
| `/runs/[any-run-id]` | Metadata grid shows a "Scenario" cell with a link |
| `pnpm typecheck` | Exits 0 |
| `pnpm lint` | Exits 0 |

If all checks pass, reply to the session: `go Stage 1.5`.

## What "go Stage 1.5" should look like (next prompt)

```
Dispatch the 2 subagents from Stage 1' of PROMPT_PHASE15_BUILD.md, each in its own
git worktree as specified. Run them in parallel. After both commit their branches,
run Stage 2' (merge, typecheck, lint, axe, Lighthouse, screenshots).
Stop and report after Stage 2' is committed.

If either subagent fails or stalls, STOP and surface the failure before merging.
Do not partial-merge.
```

## What if Stage 0' fails?

| Symptom | Likely cause | Fix |
|---|---|---|
| `git checkout -b phase-1.5` says branch already exists | Previous attempt left behind | Run `git branch -D phase-1.5` then retry — only if the branch has no work you want to keep |
| `pnpm typecheck` fails on new types | `scenarioId` added to `Run` type but existing mock data not backfilled | Confirm `data.ts` was updated to add `scenarioId` to all 30 existing runs |
| `pnpm typecheck` fails on `ModuleType` | Import missing in `root.ts` or `modules.ts` | Check that `ModuleType` is exported from `types.ts` and imported where used |
| Sidebar link appears but throws a hydration error | New lucide-react icon `Workflow` not available in installed version | Check `node_modules/lucide-react` — if `Workflow` is missing use `GitBranch` instead and note the substitution in the report |
| `/runs` table breaks (layout shift or TypeScript error) | `scenarioId` lookup fails on a run that has no matching scenario | Guard the lookup: `MOCK_SCENARIOS.find(s => s.id === run.scenarioId) ?? null` |

## Subagent ownership summary (for your reference)

| Agent | Worktree | Branch | Screens |
|---|---|---|---|
| `Scenarios-List-Agent` | `.worktrees/scenlist` | `phase15/scenarios-list` | `/scenarios` |
| `Scenarios-Builder-Agent` | `.worktrees/scenbuilder` | `phase15/scenarios-builder` | `/scenarios/new`, `/scenarios/[id]` |

Full per-agent definitions-of-done live in `PROMPT_PHASE15_BUILD.md` Stage 1'.

## Don't paste the playbook itself

`PROMPT_PHASE15_BUILD.md` is **read by the agent**, not pasted by you. The agent has Read access to it via the working directory. Pasting the playbook content into the chat wastes context.
