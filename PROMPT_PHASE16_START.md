# Kickoff Prompt — Phase 1.6 — paste this into a fresh Claude Code session

> Copy everything inside the fenced block below. Paste it as the first message in a fresh session. The rest of this file is documentation — do not paste it.

---

```
You are the orchestrator for Phase 1.6 of the Automation Dashboard inside this repo:

  C:\Users\saman\OneDrive\Documents\data-365-projects\automation

Phase 1.5 is complete and merged to main, tagged phase-1.5-done.
Phase 1.6 upgrades the scenario builder from a functional prototype to a
Zapier/Make-quality SaaS UI — branded step cards, smart collapsed summaries,
refreshed builder header, sliding test dock, trigger picker empty states,
and an enriched module library. UI only. No real APIs.

Your first job is to read these two files in full, in order, before doing anything else:

  1. CLAUDE.md                  — project map, ownership, rules, Do/Don't
  2. PROMPT_PHASE16_BUILD.md    — full Phase 1.6 playbook (Stage 0', Stage 1', Stage 2')

After reading both, execute Stage 0' ONLY:

  - Confirm you are on main at tag phase-1.5-done before doing anything else
  - Create branch phase-1.6 from main
  - Hot fix: TemplatePicker.tsx ~line 24 — change router.push("/scenarios/new")
    to router.push("/scenarios/new?template=scratch")
  - Hot fix: ScenarioDetailClient.tsx — add isPending skeleton guard to eliminate
    the 1.5s white flash; create ScenarioDetailSkeleton.tsx
  - Add Tailwind v4 color tokens to src/app/globals.css:
      --color-fb-blue, --color-sheets-green, --color-schedule-slate, --color-manual-indigo
  - Create src/lib/integration-icons.tsx (FacebookIcon, GoogleSheetsIcon, ScheduleIcon,
    ManualIcon, getIntegrationMeta — full implementation in PROMPT_PHASE16_BUILD.md 0'.5)
  - Create src/lib/cron-builder.ts (buildCron, parseCron, humanizeCronShort, nextFireAt
    — full implementation in PROMPT_PHASE16_BUILD.md 0'.6, paste it verbatim)
  - Edit src/lib/modules.ts (add shortName to ModuleDef type and all 7 entries;
    verify sampleOutput has 3 rows per module — one-time edit, then re-freeze)
  - Run pnpm typecheck and pnpm lint — fix all errors
  - Commit with message:
    "phase 1.6 stage 0': bug fixes, integration icons, cron builder, color tokens, modules.shortName"

STOP after the Stage 0' commit. Do NOT spawn subagents. Do NOT begin Stage 1'.

Report back:

  - Files modified/created (list them)
  - pnpm typecheck and pnpm lint: pass/fail summary
  - Any deviations from PROMPT_PHASE16_BUILD.md and why
  - Confirm pnpm dev boots without errors
  - Confirm navigating to /scenarios/new and clicking "Build from scratch" lands
    in the empty builder (bug fix verified — should NOT loop back to template picker)
  - Confirm /scenarios/scn_custom_01 shows the skeleton immediately with no white flash
  - Confirm src/app/globals.css contains --color-fb-blue token
  - Confirm src/lib/integration-icons.tsx and src/lib/cron-builder.ts exist

If anything fails, STOP and surface the error verbatim. Do not retry destructively.

Constraints (Phase 1.6 specific — read CLAUDE.md for base rules):

  - Phase 1.6 is UI-only with mock data. No real APIs, no Prisma, no real scheduling.
  - Do NOT add new npm dependencies without asking first (no cron-parser, no DnD lib,
    no animation lib — cron-builder.ts is implemented manually, inline, in Stage 0').
  - shadcn primitives are Base UI, NOT Radix. Use render={<X />}, NOT asChild.
  - Tailwind v4 — tokens via @theme in globals.css, no tailwind.config.ts extension.
  - No next/font/google import. System-ui stack is already wired.
  - next-themes ThemeProvider is wired with React.createElement workaround — do NOT touch.
  - NuqsAdapter is already in root layout — nuqs is available to agents freely.
  - node_modules lives inside OneDrive — do not delete or recreate it.
  - pnpm 9.15.9 (pinned), Node 22.14.
  - No any, no // @ts-ignore without reason comment, no console.log in commits.
  - No canvas / node-graph UI. Zapier-linear builder stays.
  - Do NOT introduce a canvas, node-graph, or flowchart UI.
  - Frozen files during Stage 1' (see full list in PROMPT_PHASE16_BUILD.md header).

After Stage 0' is committed and verified, wait for the human to say "go Stage 1.6"
before dispatching subagents.
```

---

## Why this prompt is short

The full playbook is in `PROMPT_PHASE16_BUILD.md` (~900 lines). This kickoff does three things only:

1. Points the orchestrator at the two files it needs to read.
2. Authorises **Stage 0' only** — bounded scope, ~25 minutes of sequential work (slightly longer than Phase 1.5's Stage 0' because of the cron-builder implementation and integration icons).
3. Hard-stops after the Stage 0' commit so you can verify before 4 parallel subagents start.

---

## How to Use It

1. Open a fresh Claude Code session in `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`.
2. Paste the fenced block above as the first message.
3. Wait for the Stage 0' report.
4. Verify manually (see checklist below).
5. If all checks pass, reply: `go Stage 1.6`

---

## What to Verify After Stage 0'

Start the dev server:

```powershell
cd C:\Users\saman\OneDrive\Documents\data-365-projects\automation
pnpm dev
# Navigate to http://localhost:3000 (or :3002 if 3000 is taken — read boot output)
```

| What to check | Expected result |
|---|---|
| `/scenarios/new` → click "Build from scratch" | Navigates to empty builder, does NOT loop back to template picker |
| `/scenarios/scn_custom_01` | Skeleton appears immediately (t=0), no white flash before content loads |
| `src/app/globals.css` | Contains `--color-fb-blue: #1877F2` and the other 3 brand tokens |
| `src/lib/integration-icons.tsx` | File exists, exports `FacebookIcon`, `GoogleSheetsIcon`, `ScheduleIcon`, `ManualIcon`, `getIntegrationMeta` |
| `src/lib/cron-builder.ts` | File exists, exports `buildCron`, `parseCron`, `humanizeCronShort`, `nextFireAt` |
| `src/lib/modules.ts` | All 7 module entries have a `shortName` field |
| `pnpm typecheck` | Exits 0 |
| `pnpm lint` | Exits 0 |
| All Phase 1.5 routes | Still render correctly — `/scenarios`, `/runs`, `/ad-accounts`, etc. |

If all checks pass, reply to the session: `go Stage 1.6`

---

## What "go Stage 1.6" Should Look Like

```
Dispatch all 4 subagents from Stage 1' of PROMPT_PHASE16_BUILD.md, each in its own
git worktree as specified. Run all 4 in parallel. After all 4 commit their branches,
run Stage 2' (merge, typecheck, lint, axe, Lighthouse, before/after screenshots).
Stop and report after Stage 2' is committed and tagged phase-1.6-done.

If any subagent fails or stalls, STOP and surface the failure before merging.
Do not partial-merge.
```

You can also run subagents in pairs if you want safer pacing. The playbook supports it — each agent's section is fully self-contained.

---

## What Happens After Stage 0'?

Stage 0' is purely **additive and bug-fix** — no visual changes to any screen. The purpose is to lay the foundation that the 4 parallel subagents need.

After Stage 0', a browser walkthrough should look **identical to Phase 1.5** with two exceptions:
- The "Build from scratch" bug is fixed (no more loop)
- The white flash on `/scenarios/[id]` is eliminated

The Zapier-quality visual upgrades happen entirely in Stage 1'. Stage 0' is invisible scaffolding.

---

## Subagent Ownership Summary

| Agent | Worktree | Branch | Primary scope |
|---|---|---|---|
| `Schedule-Picker-Agent` | `.worktrees/sched` | `phase16/schedule-picker` | `ScheduleConfig.tsx` (full rewrite to frequency-dropdown picker) |
| `Step-Card-Refresh-Agent` | `.worktrees/stepcard` | `phase16/step-card-refresh` | `StepCard.tsx`, `ModuleConfigShell.tsx`, all `*Config.tsx` except Schedule |
| `Builder-Shell-Agent` | `.worktrees/shell` | `phase16/builder-shell` | `ScenarioBuilder.tsx`, `BuilderHeader.tsx`, `TestRunPanel.tsx`, `ScenarioDetailClient.tsx` |
| `Library-Refresh-Agent` | `.worktrees/library` | `phase16/library-refresh` | `ModuleLibraryModal.tsx`, `ModuleLibraryCard.tsx`, `TemplatePicker.tsx` |

Full per-agent definitions-of-done (Tasks A.1–A.6, B.1–B.6, C.1–C.5, D.1–D.4) live in `PROMPT_PHASE16_BUILD.md` Stage 1'.

---

## What if Stage 0' Fails?

| Symptom | Likely cause | Fix |
|---|---|---|
| `pnpm typecheck` fails on `shortName` missing | `ModuleDef` type not updated before entries | Add `shortName: string` to the type definition first, then add values to entries |
| `pnpm typecheck` fails on `parseCron` return type | `ParsedCron` interface not exported or not matching usage | Ensure `ParsedCron` is exported from `cron-builder.ts` and imported where `parseCron`'s return type is referenced |
| Tailwind v4 rejects `--color-fb-blue` | Malformed `@theme {}` syntax | Check that the `@theme {}` block closes with a single `}` and that the new tokens are inside it, not outside |
| The from-scratch bug still loops | Edit went to the wrong router.push call | Confirm the change is on the line that handles "no template param" navigation in TemplatePicker.tsx, not the template-selection handler |
| White flash still present on `/scenarios/[id]` | `isPending` guard added but `ScenarioDetailSkeleton` import is missing | Confirm `ScenarioDetailSkeleton.tsx` was created and is imported at the top of `ScenarioDetailClient.tsx` |
| `parseCron` doesn't handle a specific cron pattern | The expression is non-standard (not one of our 4 named frequencies) | This is expected and by design — document the limitation and accept as-is for Phase 1.6 scope. `parseCron` returns null; the caller falls back to 'advanced' mode. We only generate and parse our own 4 patterns. |
| `nextFireAt` returns null for a schedule trigger | Parsed frequency is 'advanced' (unsupported) | Same as above — null means "can't compute"; the UI should simply omit the next-run indicator rather than showing an error |
| `git checkout -b phase-1.6` says branch already exists | Previous attempt left an uncommitted branch | Run `git branch` to check; if the branch has no work worth keeping, `git branch -D phase-1.6` then retry |

## Don't Paste the Playbook

`PROMPT_PHASE16_BUILD.md` is **read by the agent via the filesystem**, not pasted by you. The agent has Read access to it via the working directory. Pasting the playbook content into the chat wastes context and achieves nothing extra.
