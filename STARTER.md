# adsync — Starter Prompt (read this first)

> Any fresh agent session (claude-code or codex) reads **this file first**, then `CLAUDE.md`, then the master plan, then the current-phase task list. Do not start work without doing the read order below.

---

## 1. What this is

adsync is a Zapier/Make-style automation app that moves data between Facebook Ads, Google Sheets, and Bitrix24. It is currently mid-pivot from a personal single-user app to a multi-tenant product. Engine is real; some action handlers are still mocked; visuals are functional but generic.

## 2. Current phase

**Current phase: A — Make the engine real (replace mocks).**

Update this line by hand when a phase's exit gate passes. Phase order is fixed: **A → B → C, hard-gated**.

## 3. Read order (in this order, every fresh session)

1. **This file** — `STARTER.md` (you are here).
2. **`CLAUDE.md`** — project map, stack, runtime rules, repo map, house rules, do/don't.
3. **Master plan** — `docs/superpowers/specs/2026-05-14-adsync-master-plan.md` — the authoritative phase plan, exit gates, sub-tracks, non-goals.
4. **Current phase's task list** — from the writing-plans output for the active phase.
5. `git log --oneline -20` on the active branch to see what the previous session shipped.

## 4. Hard rules — non-negotiable

Treat these as build constraints, not suggestions. Violating any of them silently is the fastest way to break the app.

### Git / publish
- **Never `git push` or `gh pr create` without an explicit confirmation in the current turn.** Prior approval does not carry across pushes. Every push gets its own ok.
- **Never force-push to `main`.** Don't force-push at all without a specific reason and confirmation.
- **Never use `--no-verify` / `--no-gpg-sign`** to bypass hooks. If a hook fails, fix the root cause.

### Runtime / framework
- **Every `app/api/**` route that touches Prisma, NextAuth, or googleapis exports `runtime = "nodejs"`.** Turbopack infers edge otherwise and Prisma will fail at first DB call. Applies to `app/api/auth/[...nextauth]`, `app/api/oauth/google`, `app/api/oauth/facebook`, `app/api/trpc/[trpc]`, and any new route in those areas.
- **Middleware uses `getToken` from `next-auth/jwt`, never `auth()`.** `auth()` pulls Prisma; middleware runs in edge runtime.
- **Never drop `connection_limit=5` in `src/server/db.ts`.** It exists to prevent Turbopack HMR-leaked Prisma clients from exhausting Postgres `max_connections` in dev.
- **Never remove the entries in `next.config.js` `serverExternalPackages`.** They're needed so googleapis / Prisma / auth aren't bundled by Turbopack.

### React / hydration
- **Never call `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render bodies, `useMemo`, or lazy `useState`.** Guaranteed hydration mismatch. Use stable seeds (`"draft_step_trigger"`) or generate on event handlers. ScenarioBuilder was bit by this once.

### Code hygiene
- **No `any`.** No `// @ts-ignore` without a reason comment immediately above it.
- **No `console.log` in committed code.** Logger or nothing.
- **No Redux / Zustand / Jotai / Recoil / any global client store.** URL state goes through `nuqs`; server state through tRPC.
- **Every new module type in `src/lib/modules.ts` gets a matching handler in `src/server/core/module-handlers.ts` in the same PR.** Catalog and registry never diverge.

### Data / auth
- **Encrypt third-party tokens with `TOKEN_ENC_KEY` (AES-GCM)** when persisting to `OAuthConnection`.
- **Once Phase B starts: every tRPC procedure filters by `ctx.session.user.id`.** No exceptions. The two-user IDOR test gates Phase B exit.

### UI verification
- **A UI change is not "done" until you've opened the running app in a real browser and used the feature.** Typecheck green + tests green is *not* verification. Capture a screenshot.

## 5. Definition of "done"

A change is shippable only when **all** of these hold:

1. `pnpm typecheck` — green.
2. `pnpm lint` — green.
3. `pnpm test` — green (or no-op if nothing in the change area is tested).
4. For UI changes: real browser check at `http://localhost:3000`, screenshot attached to the PR.
5. Commits follow `<scope>: <imperative>` (`scenarios: add condition node`, `ad-accounts: fix duplicate name validation`).
6. One logical change per commit. No drive-by refactors.
7. PR description names which phase / sub-track the change belongs to (e.g. `Phase A — A.3 Sheets handlers`).

## 6. Working directory and install caveat

**Before any `pnpm install`** in this repo, `node_modules` must be a junction to a non-OneDrive path:

```powershell
if (-not (Test-Path "C:\dev\node-modules-cache\automation")) {
  New-Item -ItemType Directory -Force -Path "C:\dev\node-modules-cache\automation"
}
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
cmd /c mklink /J "node_modules" "C:\dev\node-modules-cache\automation"
```

If you ever delete `node_modules` and reinstall, redo the junction first — otherwise pnpm fights OneDrive's file-locking and Prisma's generated client breaks.

## 7. When you're stuck

- **Stop.** Don't `--no-verify`, don't disable the `connection_limit` cap, don't switch a route to edge runtime "just to make it work." Those are bug-hiding moves.
- **Write down what you tried** in the PR or in the agent message. Three sentences is enough.
- **Hand back.** The user will decide whether to redirect the approach or escalate.

## 8. Memory pointer

Auto-memory for this project lives at:
`~/.claude/projects/C--Users-saman-OneDrive-Documents-data-365-projects-automation/memory/MEMORY.md`

Check it for prior gotchas before starting — currently includes the Prisma+Turbopack connection-exhaustion fix recipe and the hydration random-IDs trap.

## 9. The two artifacts that govern the build

- **`CLAUDE.md`** — the *what* and *how*. Stack, repo map, runtime rules, conventions. Reflects current code reality.
- **`docs/superpowers/specs/2026-05-14-adsync-master-plan.md`** — the *plan*. Phase A / B / C, sub-tracks, exit gates, risks, non-goals. Reflects intent.

If the two disagree, CLAUDE.md is reality, the master plan is intent. Update whichever is wrong — don't paper over the gap.
