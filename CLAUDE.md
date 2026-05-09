# Automation Dashboard — Project Map

> **Read this first.** This file is the source of truth for any Claude Code session, subagent, or human working in this repo.

---

## What this is

A **personal, single-user web dashboard** that pulls Facebook Ads performance data into Google Sheets on a schedule plus on-demand. One user, 2–5 ad accounts, daily upserts at the campaign + ad level.

---

## Status

- **Phase 1 (current): UI-first build with mock data.** No real APIs. No real auth. No DB. Goal is a demoable, accessible, responsive dashboard whose mocks have the same shape as the future real data.
- **Phase 2 (deferred): backend wiring.** Replace mock fixtures with Prisma + Postgres, wire NextAuth (Google login), wire FB Graph + Google Sheets clients, run executor in `worker/`, scheduled + manual triggers.

The boundary between Phase 1 and Phase 2 is the `src/server/api/root.ts` tRPC router. Phase 1's procedures return from `src/server/mocks/`. Phase 2 swaps the data source — UI does not change.

---

## Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| API | tRPC v11 (mocked in Phase 1) |
| ORM | Prisma (Phase 2 only) |
| Auth | NextAuth (Phase 2 only) |
| Styling | TailwindCSS + shadcn/ui |
| Package manager | pnpm |
| Node | 20 LTS |
| URL state | `nuqs` |
| Icons | `lucide-react` |
| Base | `create-t3-app` |
| Scheduling (Phase 2) | `node-cron` in a sibling `worker/` process |
| Hosting (Phase 2) | Railway (web + worker, Postgres add-on) |

**No** Redux, Zustand, Jotai, Recoil, or any global state lib. Server components + tRPC + URL params.

---

## Repo map

```
automation/
├─ src/
│  ├─ app/
│  │  ├─ login/                     Settings-Login-Agent
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx              Stage 0 (frozen)
│  │  │  ├─ page.tsx                Stage 0 — redirects to /connections
│  │  │  ├─ connections/            Connections-UI-Agent
│  │  │  ├─ ad-accounts/
│  │  │  │  ├─ page.tsx             AdAccounts-List-Agent
│  │  │  │  ├─ new/                 AdAccount-Form-Agent
│  │  │  │  └─ [id]/                AdAccount-Form-Agent
│  │  │  ├─ runs/
│  │  │  │  ├─ page.tsx             Runs-History-Agent
│  │  │  │  └─ [id]/                Run-Detail-Agent
│  │  │  └─ settings/               Settings-Login-Agent
│  │  ├─ api/auth/                  Phase 2 only
│  │  └─ api/oauth/                 Phase 2 only
│  ├─ components/
│  │  ├─ ui/                        Stage 0 (shadcn primitives — FROZEN)
│  │  ├─ layout/                    Stage 0 (Sidebar, TopBar, UserMenu — FROZEN)
│  │  ├─ providers/                 Stage 0 (ThemeProvider, TRPCProvider — FROZEN)
│  │  ├─ connections/               Connections-UI-Agent
│  │  ├─ ad-accounts/               AdAccounts-List-Agent + AdAccount-Form-Agent
│  │  ├─ runs/                      Runs-History-Agent + Run-Detail-Agent
│  │  ├─ settings/                  Settings-Login-Agent
│  │  └─ auth/                      Settings-Login-Agent
│  ├─ server/
│  │  ├─ api/root.ts                Stage 0 (tRPC routers — FROZEN)
│  │  ├─ mocks/                     Stage 0 (fixtures — FROZEN)
│  │  └─ core/                      Phase 2 (real run executor)
│  ├─ integrations/                 Phase 2 (facebook/, google/)
│  ├─ db/                           Phase 2 (Prisma helpers)
│  └─ lib/                          Stage 0 (utils, constants — FROZEN)
├─ worker/                          Phase 2 (node-cron entrypoint)
├─ prisma/                          Phase 2
├─ tests/                           any agent may add tests for own scope
├─ docs/screenshots/                Stage 2 output
├─ PROMPT_UI_BUILD.md               full Phase 1 playbook
├─ PROMPT_START.md                  kickoff prompt — paste this to start
└─ CLAUDE.md                        this file
```

**FROZEN** = established in Stage 0, read-only during Stage 1. If you (any agent) think you need to change a frozen file, **stop and ask the orchestrator** — do not edit it.

---

## Subagent ownership (Phase 1, Stage 1)

Each subagent runs in its own git worktree at `.worktrees/<name>/` on branch `ui/<agent-name>`. Exclusive file ownership — no two agents share a writable path.

| Agent | Worktree | Branch | Owns |
|---|---|---|---|
| `Connections-UI-Agent` | `.worktrees/connections` | `ui/connections-ui` | `/connections` route + `components/connections/` |
| `AdAccounts-List-Agent` | `.worktrees/adlist` | `ui/adaccounts-list` | `/ad-accounts` page + list/row/card/toggle/run-now |
| `AdAccount-Form-Agent` | `.worktrees/adform` | `ui/adaccount-form` | `/ad-accounts/[id]` + `/new` + form components |
| `Runs-History-Agent` | `.worktrees/runs` | `ui/runs-history` | `/runs` page + table/filters/pagination |
| `Run-Detail-Agent` | `.worktrees/rundetail` | `ui/run-detail` | `/runs/[id]` + log timeline + error panel |
| `Settings-Login-Agent` | `.worktrees/settings` | `ui/settings-login` | `/login` + `/settings` |

Full per-agent definition-of-done lives in [`PROMPT_UI_BUILD.md`](./PROMPT_UI_BUILD.md).

---

## Rules every agent follows

1. **Stay in your lane.** Only write files you own. Read shared files; never edit them.
2. **All 4 states per screen.** Loading skeleton, empty, error with retry, success.
3. **Keyboard accessible.** Tab order, focus rings, Escape closes dialogs, Enter activates.
4. **Mobile responsive.** Works at 375px width. Tap targets ≥ 44px. No horizontal table scroll — switch to cards.
5. **Color is never the only signal.** Status badges have text labels. Errors have icons.
6. **Optimistic UI must roll back.** On failure, revert + toast. Never leave the UI in a half-state.
7. **Skeletons match real dimensions.** No hydration layout shift.
8. **`prefers-reduced-motion` respected.** All non-essential animations gated.
9. **No `any`. No `// @ts-ignore` without a reason comment. No `console.log` in committed code.**
10. **No new dependencies in subagents.** If a dep is missing, stop and ask.

---

## Phase 1 — Do / Don't

**DO**
- Build pages with mock data from `src/server/mocks/`
- Call mocked tRPC procedures from `src/server/api/root.ts`
- Add components in your owned directory
- Add tests in `tests/` for your scope
- Write meaningful commit messages, one logical change per commit

**DON'T**
- Call real Facebook, Google, or any external API
- Add Prisma migrations or modify `prisma/`
- Configure NextAuth providers (use `getMockSession()` from `src/server/mocks/session.ts`)
- Add Redux/Zustand/etc.
- Edit frozen files
- Add unrequested pages or components

---

## Phase 2 — what comes later (summary, not yet built)

When Phase 1 is signed off, Phase 2 wires:

- **Prisma schema:** `User`, `OAuthConnection`, `AdAccount`, `Run`, `RunLog`, `AppSetting`. Same shape as Phase 1 mock types.
- **NextAuth (Google) login** for the dashboard, allowlisted to one email.
- **OAuth flows for data sources** — Google Sheets and Facebook Graph — separate from the login session. Tokens encrypted at rest (AES-GCM, key from env).
- **Run executor** in `src/server/core/` — pulls FB Insights for configured levels + metrics + date window, daily-upserts into Sheets keyed on `(date, account_id, campaign_id|ad_id)`.
- **Scheduling** — `node-cron` in `worker/` reads `AdAccount.cronExpression`, calls the same executor as the manual "Run now" button.
- **Deployment** — Railway: `web` service (`next start`) + `worker` service (`tsx worker/index.ts`) + Postgres add-on. Both services share the same image.

---

## Running

```powershell
cd C:\Users\saman\OneDrive\Documents\data-365-projects\automation
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
```

---

## OneDrive caveat

This repo lives inside OneDrive. **Before any `pnpm install`**, `node_modules` must be a junction to a non-OneDrive path:

```powershell
if (-not (Test-Path "C:\dev\node-modules-cache\automation")) {
  New-Item -ItemType Directory -Force -Path "C:\dev\node-modules-cache\automation"
}
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
cmd /c mklink /J "node_modules" "C:\dev\node-modules-cache\automation"
```

Stage 0 of the build does this automatically. If you ever delete `node_modules` and reinstall, redo the junction first.

---

## Commit conventions

- One logical change per commit.
- Imperative mood: `add connections page`, not `added` or `adds`.
- Subagent commits: prefix with the screen or scope: `connections: add disconnect dialog`.
- No co-author lines unless the user has explicitly asked for them.

---

## Where to look

- **Want to start the Phase 1 build?** → [`PROMPT_START.md`](./PROMPT_START.md)
- **Want the full Phase 1 playbook?** → [`PROMPT_UI_BUILD.md`](./PROMPT_UI_BUILD.md)
- **Want to know who owns a file?** → table above
- **Want to know what's frozen?** → "Stage 0" entries in the repo map
- **Stuck?** → ask the orchestrator. Don't edit frozen files unilaterally.
