# Kickoff Prompt — Phase 2 — paste this into a fresh Claude Code session

> Copy everything inside the fenced block below. Paste it as the first message in a fresh session. The rest of this file is documentation — do not paste it.

---

```
You are the orchestrator for Phase 2 of the Automation Dashboard inside this repo:

  C:\Users\saman\OneDrive\Documents\data-365-projects\automation

Phase 1.6 is complete and merged to main, tagged phase-1.6-done.
Phase 2 retires every mock from the runtime path and wires real Postgres, real
NextAuth Google login, real Facebook OAuth + Marketing API, real Google Sheets
OAuth + write API, and a node-cron worker for scheduled runs.

Your first job is to read these three files in full, in order, before doing anything else:

  1. CLAUDE.md                    — project map, ownership, rules
  2. PROMPT_PHASE2_BUILD.md       — full Phase 2 playbook (Stage 0', Stage 1', Stage 2')
  3. docs/SETUP.md                — manual third-party setup guide (for the human)

After reading all three, verify the starting state:

  git describe --tags --abbrev=0
  # MUST output: phase-1.6-done
  # If it does not, ABORT immediately. Do not proceed until Phase 1.6 is tagged.

If the tag is present, execute Stage 0' ONLY:

  0'.1  Confirm tag phase-1.6-done; create branch phase-2 from main
  0'.2  Install dependencies:
          pnpm add @prisma/client next-auth@beta @auth/prisma-adapter googleapis
                   facebook-nodejs-business-sdk jose zod superjson
          pnpm add -D prisma vitest @types/node tsx
  0'.3  Create compose.yml at repo root (full content in PROMPT_PHASE2_BUILD.md 0'.3)
        Add db:up, db:down, db:reset, db:migrate, db:seed:mock, db:studio,
        worker, test scripts to package.json
  0'.4  Create prisma/schema.prisma (full verbatim schema in PROMPT_PHASE2_BUILD.md 0'.4)
        DO NOT summarise or restructure — paste it exactly as given
  0'.5  pnpm db:up  →  pnpm prisma generate  →  pnpm prisma migrate dev --name init
  0'.6  Create src/lib/crypto.ts (AES-256-GCM encryptToken/decryptToken — full impl in 0'.6)
  0'.7  Create src/server/db.ts (Prisma singleton — full impl in 0'.7)
  0'.8  Create prisma/seed-mock.ts (idempotent seed script — full impl in 0'.8)
  0'.9  Create .env.example listing all 11 required env vars (full content in 0'.9)
        Verify .env is in .gitignore
  0'.10 Overwrite docs/SETUP.md with the authoritative version from PROMPT_PHASE2_BUILD.md
        (the SETUP.md already exists — overwrite it, do NOT skip)
  0'.11 pnpm prisma generate && pnpm typecheck && pnpm lint
        Git add and commit:
          "phase 2 stage 0': prisma schema, docker compose, crypto, db singleton,
           seed script, env example, SETUP.md"

STOP after the Stage 0' commit. Report back immediately. Do NOT spawn subagents.
Do NOT proceed to Stage 1'.

Report back:

  - Files created/modified (absolute paths)
  - pnpm typecheck: pass/fail (show first error if fail)
  - pnpm lint: pass/fail
  - pnpm db:up: succeeded / failed (show error if fail)
  - pnpm prisma migrate dev: migration name, number of tables created
  - pnpm db:seed:mock: the "Seeded" output line
  - Confirm src/lib/crypto.ts exists
  - Confirm src/server/db.ts exports db
  - Confirm prisma/schema.prisma has 11 models (User, Account, Session,
    VerificationToken, OAuthConnection, AdAccount, Scenario, ScenarioStep,
    Run, RunLog, AppSetting)
  - Confirm .env.example has all 11 required env vars
  - Confirm docs/SETUP.md was written (show first 5 lines)

If anything fails, STOP and surface the exact error. Do not retry destructively
(especially pnpm db:reset — ask the user first).

Two checkpoints before Stage 1' is authorised:

  CHECKPOINT 1: Stage 0' commit verified (you report back, human verifies)
  CHECKPOINT 2: Human completes docs/SETUP.md manual setup and replies
                "manual setup done"

Do NOT begin Stage 1' until BOTH checkpoints are cleared.

Phase 2 constraints (read CLAUDE.md for base rules — these override):

  - UI is frozen. Do NOT edit src/components/, src/app/(dashboard)/, or src/styles/.
  - Token encryption is mandatory. Every accessToken and refreshToken in the DB
    must be encrypted with AES-256-GCM via src/lib/crypto.ts. Plaintext = critical bug.
  - No token plaintext in logs ever.
  - No new npm dependencies after 0'.2 without asking.
  - No any type. No // @ts-ignore without a one-line reason.
  - No deployment. No remote push. No Railway/Vercel config.
  - No job queue (no BullMQ, no Redis). node-cron only.
  - No additional auth (no email/password, no magic link).
  - pnpm 9.15.9 (pinned), Node 22.14.
  - node_modules lives inside OneDrive — do NOT delete or recreate it.
  - shadcn primitives are Base UI: render={<X />}, NOT asChild.
  - next-themes ThemeProvider is a black box — do NOT touch.
  - Mocks at src/server/mocks/ are preserved but only for prisma/seed-mock.ts import.
    No runtime code may import from src/server/mocks/ after Phase 2 lands.
```

---

## Why this prompt is short

The full playbook is in `PROMPT_PHASE2_BUILD.md` (~1700 lines). This kickoff does three things only:

1. Points the orchestrator at the three files it must read.
2. Authorises **Stage 0' only** — bounded scope, ~45 minutes. Longer than previous phases because the Prisma schema is ~100 lines verbatim, Docker Compose must run, and the seed script must execute successfully.
3. Hard-stops twice before Stage 1': once after Stage 0' commit (you verify), and once after you complete the manual setup (Facebook Developer App, Google Cloud project, `.env` file).

---

## How to Use It

1. Open a fresh Claude Code session in `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`.
2. Paste the fenced block above as the first message.
3. Wait for the Stage 0' report.
4. Verify manually (checklist below).
5. Follow `docs/SETUP.md` to complete manual setup (~45 min).
6. Reply to the session: `manual setup done`

---

## What to Verify After Stage 0'

**Infrastructure:**

```powershell
# Confirm Postgres is running
docker ps | Select-String "automation-postgres"
# Expected: a line with "automation-postgres" and "Up X seconds"

# Confirm DB has the schema
pnpm prisma studio
# Navigate to http://localhost:5555 — you should see 11 models in the left sidebar
```

**Files:**

| Path | Expected state |
|---|---|
| `compose.yml` | Exists at repo root, service named `postgres`, image `postgres:16-alpine` |
| `prisma/schema.prisma` | Contains 11 models and 9 enums |
| `src/lib/crypto.ts` | Exports `encryptToken` and `decryptToken` |
| `src/server/db.ts` | Exports `db` as singleton PrismaClient |
| `prisma/seed-mock.ts` | Exists; running `pnpm db:seed:mock` prints "Seeded: 1 user, 3 ad accounts, 7 scenarios, 30 runs, logs" |
| `.env.example` | Lists `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_SHEETS_CLIENT_ID`, `GOOGLE_OAUTH_SHEETS_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `TOKEN_ENC_KEY`, `ALLOWLIST_EMAIL` |
| `docs/SETUP.md` | Exists; starts with "# Phase 2 — Manual Setup Guide" |

**Quality:**

```powershell
pnpm typecheck   # exits 0
pnpm lint        # exits 0
```

**Dev server still works:**

```powershell
pnpm dev
# Navigate to http://localhost:3000 (or :3002)
# The existing Phase 1.6 UI should still render fine (mocks still in place until Stage 1')
# /scenarios should still show the mock scenario list
# /runs should still show the mock run history
```

If all checks pass, proceed to the manual setup below. If any check fails, reply to the orchestrator session with the error — do NOT paste `manual setup done`.

---

## After Stage 0': What You (the Human) Do — ~45 min

This is the manual third-party setup that only you can do. The Claude session waits for you during this time. The full step-by-step is in `docs/SETUP.md`. Summary:

**1. Facebook Developer App (~20 min)**
- https://developers.facebook.com → Create App (Business type)
- Add Marketing API product
- Copy App ID + App Secret → paste into `.env`
- Add `localhost` to App Domains; add `http://localhost:3000` as Website URL
- Add redirect URI: `http://localhost:3000/api/oauth/facebook/callback`
- Create a Test User, give them access to the app
- Create a Test Ad Account with at least one paused campaign (required for Insights API to return data)

**2. Google Cloud Project (~15 min)**
- https://console.cloud.google.com → New Project `automation-dev`
- Enable Google Sheets API
- OAuth consent screen: External, Testing mode, add `jumanovsamandar005@gmail.com` as test user, add `spreadsheets` scope
- Create **two OAuth Client IDs** (Web application):
  - Client 1 (Login): redirect URI `http://localhost:3000/api/auth/callback/google` → `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
  - Client 2 (Sheets): redirect URI `http://localhost:3000/api/oauth/google/callback` → `GOOGLE_OAUTH_SHEETS_CLIENT_ID` + `GOOGLE_OAUTH_SHEETS_CLIENT_SECRET`

**3. Fill in `.env` (~5 min)**
```powershell
Copy-Item .env.example .env
# Open .env and fill in all values.
# Generate TOKEN_ENC_KEY (64 hex chars, 32 bytes):
[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) -replace '-',''
# Generate NEXTAUTH_SECRET (base64, 32 bytes):
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**4. Create a target Google Sheet (~2 min)**
- https://sheets.google.com → Blank sheet → name it "Automation Test"
- Copy the Sheet ID from the URL (the long string between `/d/` and `/edit`)
- Save it — you will paste it into a scenario step config during the Stage 2' e2e test

**5. Smoke test**
```powershell
pnpm db:up
pnpm prisma migrate dev   # should say "already up to date" or apply init migration
pnpm dev
# Open http://localhost:3000 → should redirect to /login
# Click Sign in with Google → Google consent screen should appear
```

Once Step 5 passes, return to the Claude Code session and reply: `manual setup done`

**Estimated time: 45 min.** The trickiest part is the Facebook test user setup (section 1). If Facebook's Developer portal is slow, budget 30 min for the FB section alone.

---

## What Happens After "manual setup done"?

Replying `manual setup done` authorises Stage 1': the orchestrator dispatches 4 parallel subagents in separate git worktrees. Estimated time: ~6–7 hours of concurrent agent work.

```
Dispatch all 4 subagents from Stage 1' of PROMPT_PHASE2_BUILD.md, each in its own
git worktree as specified. Run all 4 in parallel.

Worktrees:
  .worktrees/auth    → phase2/nextauth
  .worktrees/sheets  → phase2/google-sheets-integration
  .worktrees/fb      → phase2/facebook-integration
  .worktrees/exec    → phase2/executor-and-worker

After all 4 agents commit their branches, run Stage 2' (merge in order: auth →
sheets → fb → exec, pnpm typecheck after each, then full quality gate, then manual
e2e walkthrough as written in Stage 2'.3 of PROMPT_PHASE2_BUILD.md).

Stop and report after Stage 2' is committed and tagged phase-2-done.

If any subagent fails or stalls, STOP and surface the failure before merging.
Do not partial-merge. Do not auto-retry destructively.
```

You can also run the subagents sequentially if you prefer (auth first, then sheets, then fb, then exec) — the playbook supports sequential execution. Each agent's section is fully self-contained.

---

## Subagent Ownership Summary

| Agent | Worktree | Branch | Primary scope |
|---|---|---|---|
| `NextAuth-Agent` | `.worktrees/auth` | `phase2/nextauth` | Real Google login, middleware, authedProcedure, settings router |
| `Google-Sheets-Integration-Agent` | `.worktrees/sheets` | `phase2/google-sheets-integration` | Google OAuth flow, Sheets API client, connections router (Google + FB stubs) |
| `Facebook-Integration-Agent` | `.worktrees/fb` | `phase2/facebook-integration` | FB OAuth flow, Graph API client, fb router, connections router FB stubs |
| `Executor-and-Worker-Agent` | `.worktrees/exec` | `phase2/executor-and-worker` | Run executor, module handlers, worker cron, scenarios/runs/runLogs/adAccounts routers |

Full per-agent definitions-of-done (file lists, code sketches, acceptance criteria) live in `PROMPT_PHASE2_BUILD.md` Stage 1'.

**Critical merge-order constraint:** Agent B (Google Sheets) must be merged before Agent C (Facebook) because `connections.ts` is written by Agent B with Facebook stubs, then filled in by Agent C. The orchestrator enforces this in Stage 2'.1.

---

## Common Stage 0' Failures

| Symptom | Likely cause | Fix |
|---|---|---|
| `git describe` does not show `phase-1.6-done` | Phase 1.6 was not tagged or branch is stale | Run `git log --oneline -5` to see recent commits; if Phase 1.6 work is present but untagged, tag manually: `git tag phase-1.6-done HEAD~N` where N is the offset, or ask the user |
| `pnpm add next-auth@beta` fails | Registry timeout or version conflict | Retry once; if still failing, check `pnpm-lock.yaml` for conflicting next-auth versions |
| `pnpm prisma generate` fails | `@prisma/client` not installed yet | Confirm `pnpm add @prisma/client` succeeded; check `node_modules/@prisma/client` exists |
| `docker compose up -d` fails with "port already in use" | Another Postgres is running on 5432 | Run `netstat -ano | Select-String "5432"` to find the PID; either stop it or change compose.yml port to `"5433:5432"` and update DATABASE_URL accordingly |
| `pnpm prisma migrate dev` fails with "type already exists" | Stale DB state from a previous attempt | Run `pnpm db:reset` to destroy and recreate the Docker volume, then retry from `pnpm db:up` |
| `pnpm db:seed:mock` fails with TypeError on Date | Seed script passes a Date object where Prisma expects a different format | Ensure `startedAt`, `createdAt` etc. in seed script use `new Date(...)` not raw ISO strings |
| `pnpm db:seed:mock` fails with "Missing required env" | `.env` file not created yet | Copy `.env.example` to `.env` and fill in `DATABASE_URL` at minimum; other vars can be placeholders for now |
| `pnpm typecheck` fails on `auth()` import | `next-auth@beta` types not yet resolved | Run `pnpm prisma generate` first; if still failing, run `pnpm install` to sync lock file |
| `pnpm typecheck` fails on missing `authedProcedure` | Stage 0' does not add this — it's added by Agent A in Stage 1' | This is expected; Stage 0' typecheck should pass without `authedProcedure` |

---

## Don't Paste the Playbook

`PROMPT_PHASE2_BUILD.md` is **read by the agent via the filesystem**, not pasted by you. The agent has Read access to it via the working directory. Pasting the playbook content into the chat wastes context and achieves nothing extra.
