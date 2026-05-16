# adsync Agent Guide

This file is the Codex-facing project guide. Treat `CLAUDE.md` as the canonical source of truth and keep this file aligned with it when project rules change.

## Project

`adsync` is a personal, single-user automation dashboard. It pulls Facebook Ads performance data into Google Sheets, provides a Zapier-style scenario builder for Facebook, Google Sheets, and Bitrix24 modules, and runs manual plus scheduled executions through the sibling `worker/` process.

The app is no longer mocks-only. Prisma/Postgres, NextAuth Google login, OAuth connections, token encryption, real Phase-A module execution, and the worker scheduler are active production paths.

## Stack

- Next.js 15 App Router with Turbopack dev
- TypeScript strict
- tRPC v11
- Prisma 6 with Postgres
- NextAuth v5 beta with Google provider, JWT sessions, and PrismaAdapter
- TailwindCSS 4, shadcn/ui, and base-ui/react
- `sonner` toasts
- `pnpm`
- Node 20 LTS
- `nuqs` for URL state
- `lucide-react` plus brand SVGs in `src/lib/integration-icons.tsx`
- Railway web and worker services

Do not add Redux, Zustand, Jotai, Recoil, or any other global state library. Use server components, tRPC, and URL params.

## Runtime Rules

- Every `app/api/auth/**`, `app/api/oauth/**`, and tRPC route handler must export `runtime = "nodejs"` when it touches Prisma, auth, or googleapis.
- Middleware must use `getToken` from `next-auth/jwt`, not `auth()`, because middleware runs at the edge and Prisma is not edge-safe.
- Keep the Prisma singleton and development `connection_limit=5` behavior in `src/server/db.ts`.
- Keep `serverExternalPackages` in `next.config.js` for `googleapis`, `google-auth-library`, `gaxios`, `gcp-metadata`, `@prisma/client`, `@auth/prisma-adapter`, and `prisma`.
- `next.config.js` intentionally disables dev indicators. Re-enable only when explicitly asked.

## Architecture

- `src/server/api/root.ts` is the API contract. UI code should go through tRPC routers, never directly through integration clients.
- `src/server/core/module-handlers.ts` is the single source of truth for executable module types.
- New module types must be added to both `src/lib/modules.ts` and `src/server/core/module-handlers.ts` in the same change.
- Catalog modules that are not implemented should route to `notImplementedHandler`, which throws `MODULE_NOT_IMPLEMENTED`.
- Read `docs/MODULE_AUDIT.md` before adding, removing, or reclassifying module types.
- Keep token persistence encrypted with `TOKEN_ENC_KEY` using AES-GCM.

## UI Rules

- Every screen needs loading, empty, error-with-retry, and success states.
- Keep keyboard access intact: tab order, visible focus rings, Escape closes dialogs, and Enter activates controls.
- Support mobile at 375px. Tap targets should be at least 44px. Avoid horizontal table scroll; switch to cards.
- Do not use color as the only status signal. Statuses need text labels; errors need icons.
- Optimistic UI must roll back on failure and show a toast.
- Skeletons should match real dimensions to avoid hydration layout shift.
- Respect `prefers-reduced-motion` for non-essential animation.
- Avoid `any`, unexplained `// @ts-ignore`, and committed `console.log`.
- Do not call `Date.now()`, `Math.random()`, or `crypto.randomUUID()` inside render bodies, lazy `useState`, or `useMemo`.
- Scenario step configuration uses `StepConfigModal`, not inline expansion.
- Autosave UX should update `savedBaseline` after every successful save so discard prompts compare against the real saved state.

## Commands

Run from the repository root:

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm smoke:run
```

Use `pnpm dev` for `http://localhost:3000`. For UI work, do not claim the change works without a real browser check.

## OneDrive Caveat

This repo lives inside OneDrive. Before any `pnpm install`, `node_modules` must be a junction to a non-OneDrive path:

```powershell
if (-not (Test-Path "C:\dev\node-modules-cache\automation")) {
  New-Item -ItemType Directory -Force -Path "C:\dev\node-modules-cache\automation"
}
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
cmd /c mklink /J "node_modules" "C:\dev\node-modules-cache\automation"
```

Redo the junction first if `node_modules` is ever deleted and dependencies need to be reinstalled.

## Git And Process

- The old Phase-1 subagent worktree flow is archived. Build directly on a feature branch and merge to `main`.
- Make one logical change per commit.
- Use imperative commit messages scoped by area, such as `scenarios: add run retry`.
- Do not add co-author lines unless explicitly requested.
- Do not push without explicit confirmation in the current turn. Every push needs its own confirmation.
- Do not revert unrelated user changes.

## References

- Fresh session onboarding: `STARTER.md`
- Smoke test: `docs/SMOKE_TEST.md`
- Module decisions: `docs/MODULE_AUDIT.md`
- Railway deploy guide: `docs/DEPLOY.md`
- Bitrix24 and Sheets sync: `docs/SYNC.md`
- Module catalog: `src/lib/modules.ts`
- Module registry: `src/server/core/module-handlers.ts`
- Brand icons: `src/lib/integration-icons.tsx`
