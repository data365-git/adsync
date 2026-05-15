# adsync — Project Map

> **Read this first.** This file is the source of truth for any Claude Code session, subagent, or human working in this repo.

**GitHub:** https://github.com/data365-git/adsync (public, single-user app).

---

## What this is

A **personal, single-user automation dashboard** that:
1. Pulls Facebook Ads performance data into Google Sheets on a schedule plus on-demand (the original "ad sync" workflow).
2. Hosts a Zapier-style **scenario builder** that chains trigger + action modules across Facebook, Google Sheets, and Bitrix24.
3. Runs both manual and scheduled (cron-style) executions via a sibling `worker/` process.

One user, 2–5 ad accounts, daily upserts at the campaign + ad level.

---

## Status

We are past the mocks-only phase. The current build has:

- **Real Prisma + Postgres** wired through `src/server/db.ts`. Schema covers `User`, `Account`, `Session`, `OAuthConnection`, `AdAccount`, `Scenario`, `ScenarioStep`, `Run`, `RunLog`, plus Bitrix24 sync models.
- **Real NextAuth (Google) login** with `PrismaAdapter`, JWT session strategy, email allowlist. Middleware uses edge-safe `getToken` (Prisma is **not** edge-safe).
- **Real OAuth flows** for Google Sheets and Facebook Graph as data sources, tokens encrypted at rest via `TOKEN_ENC_KEY` (AES-GCM).
- **Real run executor** in `src/server/core/` driven by a registry in `src/server/core/module-handlers.ts`. **All Phase-A modules now hit real clients** — `fb.list_ad_accounts`, `fb.account_insights`, `sheets.append`/`upsert`/`find_rows`/`update_row`, `bitrix.create_lead`, `bitrix.update_lead`. The legacy `mockActionHandler` has been deleted.
- **Worker** in `worker/` running `setInterval` polling (not `node-cron`) — schedules adapters + a Sheets ↔ Bitrix24 sync orchestrator.
- **Deployment configs** for Railway (`railway.json` web, `railway.worker.json` worker) and a full guide at [`docs/DEPLOY.md`](./docs/DEPLOY.md).
- **Canonical end-to-end smoke test** documented in [`docs/SMOKE_TEST.md`](./docs/SMOKE_TEST.md) with a `scripts/` seed. Use this to verify Phase-A modules after any handler change.

**Deferred modules** (everything not in the Phase-A list above — e.g. `fb.list_ads`, `sheets.delete_row`, `bitrix.find_leads`, `bitrix.create_deal`) are wired to `notImplementedHandler`, which **throws `MODULE_NOT_IMPLEMENTED`** at run time. There is no silent `{ rowCount: 1 }` fallback anymore. Keep/defer/cut decisions for every module type are locked in [`docs/MODULE_AUDIT.md`](./docs/MODULE_AUDIT.md) — read it before adding or removing a module.

The `src/server/api/root.ts` router is the contract. Procedures should always be the entry point — never call clients/integrations directly from React components.

---

## Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack dev) |
| Language | TypeScript (strict) |
| API | tRPC v11 |
| ORM | Prisma 6 (Postgres) |
| Auth | NextAuth v5 beta (Google provider, JWT strategy, PrismaAdapter) |
| Styling | TailwindCSS 4 (`@theme inline`) + shadcn/ui + base-ui/react |
| Toasts | `sonner` |
| Package manager | pnpm |
| Node | 20 LTS |
| URL state | `nuqs` |
| Icons | `lucide-react` + custom brand SVGs in `src/lib/integration-icons.tsx` |
| Base | `create-t3-app` |
| Scheduling | `setInterval` in `worker/` (no `node-cron` dep) |
| Hosting | Railway (web + worker services, Postgres add-on) |

**No** Redux, Zustand, Jotai, Recoil, or any global state lib. Server components + tRPC + URL params.

### Runtime rules (load-bearing — don't change blindly)

- **All `app/api/auth/**` and `app/api/oauth/**` route handlers must declare `export const runtime = "nodejs";`.** Turbopack will otherwise infer edge runtime and Prisma will fail at first DB call. Same applies to the tRPC handler.
- **Middleware uses `getToken` from `next-auth/jwt`, NOT `auth()`.** `auth()` pulls in Prisma which cannot run in the edge runtime middleware executes in.
- **`src/server/db.ts` caps `connection_limit=5` in dev** to keep turbopack HMR-leaked clients from exhausting Postgres `max_connections` (default 100). Symptom if removed: `PrismaClientInitializationError` / "too many connections" hitting whatever query the user runs first after enough hot reloads. Keep the singleton + cap.
- **`next.config.js` lists `serverExternalPackages`** for `googleapis`, `google-auth-library`, `gaxios`, `gcp-metadata`, `@prisma/client`, `@auth/prisma-adapter`, `prisma`. Don't remove — needed so they aren't bundled by Turbopack.
- **`next.config.js` sets `devIndicators: false`** (the bottom-left "N" badge is hidden). Re-enable only if explicitly asked.

---

## Repo map

```
adsync/
├─ src/
│  ├─ app/
│  │  ├─ login/
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx               sticky sidebar + main content
│  │  │  ├─ page.tsx                 redirects to /connections
│  │  │  ├─ connections/             Google + FB OAuth status, connect/disconnect
│  │  │  ├─ ad-accounts/             list + form (modal-driven, FB+Sheets logos)
│  │  │  ├─ scenarios/               Zapier-style builder
│  │  │  │  ├─ page.tsx              scenario list
│  │  │  │  ├─ new/                  new-scenario page (mounts ScenarioBuilder)
│  │  │  │  └─ [id]/                 detail w/ autosave + Discard-baseline pattern
│  │  │  ├─ runs/                    history + detail
│  │  │  └─ settings/
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/      runtime="nodejs" — REQUIRED
│  │  │  ├─ oauth/google/            runtime="nodejs" — REQUIRED
│  │  │  ├─ oauth/facebook/          runtime="nodejs" — REQUIRED
│  │  │  └─ trpc/[trpc]/             runtime="nodejs" — REQUIRED
│  ├─ components/
│  │  ├─ ui/                         shadcn primitives + base-ui dialog
│  │  ├─ layout/                     Sidebar (brand "adsync", user+theme in footer), mobile TopBar
│  │  ├─ providers/                  ThemeProvider, TRPCProvider
│  │  ├─ connections/
│  │  ├─ ad-accounts/                AdAccountsPageClient (modal mgmt), AdAccountModal, form/
│  │  ├─ scenarios/
│  │  │  └─ builder/                 ScenarioBuilder, BuilderHeader (fixed, 60px),
│  │  │                              StepCard, StepConfigModal, modules/ModuleConfigShell
│  │  ├─ runs/
│  │  └─ settings/
│  ├─ server/
│  │  ├─ db.ts                       Prisma singleton w/ dev pool cap — see Runtime rules
│  │  ├─ auth.ts / auth-config.ts    NextAuth v5 setup
│  │  ├─ api/
│  │  │  ├─ root.ts                  router composition
│  │  │  ├─ trpc.ts                  context + middleware
│  │  │  └─ routers/                 connections, adAccounts, scenarios, runs, modules, sync
│  │  ├─ core/                       run executor + module-handlers registry
│  │  ├─ bitrix24/                   client + sync logic
│  │  ├─ sheets/                     client + poller
│  │  ├─ sync/                       Bitrix ↔ Sheets sync orchestrator
│  │  └─ mocks/                      kept as-is for module sample outputs
│  ├─ integrations/                  facebook/graph-client, google/sheets-client
│  └─ lib/                           utils, modules.ts (module catalog), integration-icons.tsx
├─ worker/
│  ├─ index.ts                       worker entrypoint
│  └─ scheduler.ts                   setInterval-based tick
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ docs/
│  ├─ DEPLOY.md                      Railway deployment guide (env matrix, OAuth callbacks, rollback)
│  ├─ SYNC.md                        Bitrix24 ↔ Sheets sync notes
│  └─ UI_UX_AUDIT.md
├─ railway.json                      web service config
├─ railway.worker.json               worker service config
└─ CLAUDE.md                         this file
```

The historical Phase-1 subagent-worktree model (one agent per route on its own `ui/*` branch) is **archived**. We now build directly on a feature branch and merge to `main`. The old `PROMPT_START.md` / `PROMPT_UI_BUILD.md` documents describe that initial scaffold; they are reference material, not active process.

---

## House rules (UI + general)

1. **All 4 states per screen.** Loading skeleton, empty, error with retry, success.
2. **Keyboard accessible.** Tab order, focus rings, Escape closes dialogs, Enter activates.
3. **Mobile responsive.** Works at 375px width. Tap targets ≥ 44px. No horizontal table scroll — switch to cards.
4. **Color is never the only signal.** Status badges have text labels. Errors have icons.
5. **Optimistic UI must roll back.** On failure, revert + toast. Never leave the UI in a half-state.
6. **Skeletons match real dimensions.** No hydration layout shift.
7. **`prefers-reduced-motion` respected.** All non-essential animations gated.
8. **No `any`. No `// @ts-ignore` without a reason comment. No `console.log` in committed code.**
9. **Never call `Date.now()` / `Math.random()` / `crypto.randomUUID()` inside `useMemo`, lazy `useState`, or a render body.** That is a guaranteed hydration mismatch. Use a stable seed (`"draft_step_trigger"` etc.) or generate on event handlers. ScenarioBuilder was bit by this once — see the auto-memory note.
10. **Typography:** body text is not bold. Headings use `text-lg` / `text-base` with normal weight unless a primitive's variant demands otherwise. Step/section headers carry a brand icon tile, not heavy weight.
11. **Step config UX:** the scenario builder uses a **modal** for config (`StepConfigModal`), not inline expansion. Cards in `ModuleConfigShell` are collapsed-only.
12. **Save UX:** autosave with debounce + `sonner` "Saved" toast. The "Discard unsaved changes?" prompt compares against a `savedBaseline` state that updates after every successful save — don't compare against the freshly-fetched query result.

## Module handler registry

`src/server/core/module-handlers.ts` is the **single source of truth** for what module types can execute. Adding a new module to the catalog (`src/lib/modules.ts`) without adding a handler here causes runs to fail with "No handler registered for module type: X". Modules that are part of the catalog but not yet implemented are explicitly routed to `notImplementedHandler` — it throws `MODULE_NOT_IMPLEMENTED` so unfinished work fails loudly instead of pretending to succeed. When you ship a real handler, replace the `notImplementedHandler` entry in the registry map; don't add a parallel mock.

## Do / Don't

**DO**
- Go through `src/server/api/root.ts` routers from the UI — never call clients directly.
- Add Prisma migrations via `pnpm prisma migrate dev` and commit them under `prisma/migrations/`.
- Encrypt third-party tokens with `TOKEN_ENC_KEY` (AES-GCM) when persisting to `OAuthConnection`.
- Add new module types in `src/lib/modules.ts` AND `src/server/core/module-handlers.ts` in the same change.
- Pin every new `app/api/**` route to `runtime = "nodejs"` if it touches Prisma, auth, or googleapis.
- Write meaningful commit messages, one logical change per commit, scoped by area (`scenarios: ...`, `ad-accounts: ...`).

**DON'T**
- Add Redux/Zustand/etc. URL state goes through `nuqs`; server state through tRPC.
- Drop the `connection_limit` cap in `src/server/db.ts` (see Runtime rules).
- Use edge runtime for anything that touches Prisma or googleapis.
- Add `console.log` to committed code.
- Push without an explicit confirmation in the current turn (carries from `~/.claude/CLAUDE.md` — every push gets its own ok).
- Claim a UI change "works" without a real browser check — type-check + tests are not sufficient.

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

If you ever delete `node_modules` and reinstall, redo the junction first — otherwise pnpm fights OneDrive's file-locking and breaks Prisma's generated client.

---

## Commit conventions

- One logical change per commit.
- Imperative mood: `add connections page`, not `added` or `adds`.
- Prefix with the screen or scope: `connections: add disconnect dialog`, `scenarios: switch step config to modal`.
- No co-author lines unless the user has explicitly asked for them.

---

## Where to look

- **Onboarding a fresh agent session** → [`STARTER.md`](./STARTER.md)
- **End-to-end smoke test** → [`docs/SMOKE_TEST.md`](./docs/SMOKE_TEST.md)
- **Module keep / defer / cut decisions** → [`docs/MODULE_AUDIT.md`](./docs/MODULE_AUDIT.md)
- **Deploying to Railway** → [`docs/DEPLOY.md`](./docs/DEPLOY.md) (env matrix, OAuth callbacks, rollback)
- **Bitrix ↔ Sheets sync details** → [`docs/SYNC.md`](./docs/SYNC.md)
- **Module catalog (what triggers/actions exist)** → `src/lib/modules.ts`
- **Module execution registry** → `src/server/core/module-handlers.ts`
- **Brand icons / integration metadata** → `src/lib/integration-icons.tsx`
- **Original UI scaffold playbook (historical)** → `PROMPT_UI_BUILD.md`, `PROMPT_START.md`
