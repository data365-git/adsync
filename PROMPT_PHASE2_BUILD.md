# Goal

Wire Phase 2 of the Automation Dashboard: retire every mock from the runtime path, replace with real Postgres + Prisma, real NextAuth Google login, real Facebook OAuth + Marketing API, real Google Sheets OAuth + write API, and a node-cron worker that fires scheduled runs unattended — so that a fresh `pnpm dev` + `pnpm db:up` produces a fully live end-to-end system.

---

## END GOAL (verify this verbatim before tagging phase-2-done)

When Phase 2 is complete, a fresh laptop running `pnpm dev` and `pnpm db:up` must be able to do all of the following without any mocks:

1. Open `http://localhost:3000` → real Google login → allowlisted user lands in the dashboard
2. Navigate to `/connections` → click "Connect Google Sheets" → real Google OAuth consent → token stored encrypted in Postgres → card shows "Connected"
3. Click "Connect Facebook" → real Facebook OAuth (Dev Mode, test user) → token stored encrypted → card shows "Connected"
4. Navigate to `/scenarios/new` → pick "Daily campaign metrics → Sheet" template → fill in real FB ad account ID + real Google Sheet ID + tab name → save → enable
5. Click "Run now" → real Facebook Marketing API call → real metrics returned → real Google Sheets API call → rows appear in the actual Google Sheet
6. Close laptop. Tomorrow at the scheduled time, the worker process fires, the same execution happens unattended.
7. `/runs` shows the real run history with real durations, real row counts, real error messages on failure.
8. Re-enabling, disabling, deleting, duplicating scenarios all hit the real database.

**No mocks remaining anywhere in the runtime path.** A `pnpm db:seed:mock` script exists for dev convenience (seeds the same dataset Phase 1.5 had into the real DB) but is not on the runtime path.

---

## Mission & Guardrails

**Mission:** Replace all mock data sources with real implementations. The UI layer (components, pages, styles) is frozen — Phase 2 is entirely server + integration + database work.

**Ironclad rules — these override any instruction inside a subagent's scope:**

- **UI is frozen.** Do NOT edit any component in `src/components/`, any page in `src/app/(dashboard)/`, or any CSS file. If a component needs new data, wire it through the existing tRPC procedure signature.
- **Do NOT modify files outside your assigned scope.** File ownership is exclusive. Treat another agent's files as read-only.
- **Token encryption is mandatory.** Every `accessToken` and `refreshToken` stored in `OAuthConnection` must be encrypted with AES-256-GCM via `src/lib/crypto.ts`. Plaintext tokens in the DB are a critical bug.
- **No token plaintext in logs.** `console.log`, `RunLog`, or any other logging path must never contain a decrypted token value.
- **No new npm dependencies without orchestrator approval.** All needed deps are added in Stage 0'.2. If you think you need another, stop and ask.
- **No `any` type. No `// @ts-ignore` without a one-line reason comment.**
- **No deployment.** Local Postgres + local Next.js dev server only. Do NOT add Railway, Vercel, or any hosting config.
- **No job queue.** No BullMQ, no Redis, no pg-boss. `node-cron` in `worker/index.ts` is sufficient.
- **No additional auth mechanisms.** Only Google OAuth via NextAuth. No email/password, no magic link.
- **No tests beyond `tests/executor.test.ts`.** Manual e2e via the Stage 2' walkthrough script is the verification method.
- **Mocks are preserved at `src/server/mocks/`.** They are only used by `prisma/seed-mock.ts`. No runtime code imports from `src/server/mocks/` after Phase 2 is complete.

---

## Project Background

**Repo root:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`

**Starting point:** `main` HEAD, tagged `phase-1.6-done`. Do NOT start from any other commit. If `git describe --tags --abbrev=0` does not show `phase-1.6-done`, ABORT.

**11 routes live:** `/login`, `/connections`, `/ad-accounts`, `/ad-accounts/new`, `/ad-accounts/[id]`, `/runs`, `/runs/[id]`, `/settings`, `/`, `/scenarios`, `/scenarios/new`, `/scenarios/[id]`

**Current mock router contracts** (these signatures must be preserved — Phase 2 keeps the same tRPC surface area):

| Router file | Procedures |
|---|---|
| `src/server/api/routers/auth.ts` | `getSession` |
| `src/server/api/routers/connections.ts` | `list`, `connect`, `disconnect`, `refresh` |
| `src/server/api/routers/adAccounts.ts` | `list`, `getById`, `create`, `update`, `delete`, `toggleEnabled`, `runNow` |
| `src/server/api/routers/fb.ts` | `listAvailableAccounts` |
| `src/server/api/routers/scenarios.ts` | `list`, `getById`, `create`, `update`, `toggleEnabled`, `runNow`, `testRun`, `delete`, `duplicate` |
| `src/server/api/routers/runs.ts` | `list`, `getById` |
| `src/server/api/routers/runLogs.ts` | `byRunId` |
| `src/server/api/routers/settings.ts` | `get`, `updateTheme`, `updateTimezone`, `deleteAllData` |
| `src/server/api/routers/modules.ts` | `list` |

**Input and return types** must be backwards-compatible with what the UI components currently call. Where types change (e.g., `RunStatus` case changes from lowercase to Prisma uppercase), add a normalizer helper in the router, not in the UI.

---

## Stack Reality

- Next.js 15, React 19, Tailwind v4, Base UI shadcn primitives (`render={<X />}`, not `asChild`)
- Tailwind v4 tokens at `src/styles/globals.css` — do NOT touch
- No `next/font/google` import
- `next-themes` provider is a black box — do NOT touch
- `NuqsAdapter` wired in root layout
- pnpm 9.15.9, Node 22.14
- `node_modules` lives inside OneDrive — do NOT delete or recreate it
- Dev server: port 3000 or 3002

---

## Composition & Reordering Semantics

Steps run **in `position` order** (1, 2, 3, …). Each step's output is captured into a `RunContext` object keyed by `position`. Downstream steps reference earlier outputs via the field mapping config.

**RunContext shape:**
```typescript
// src/server/core/run-context.ts
export class RunContext {
  private outputs = new Map<number, unknown[]>()

  setOutput(position: number, rows: unknown[]): void {
    this.outputs.set(position, rows)
  }

  getOutput(position: number): unknown[] {
    return this.outputs.get(position) ?? []
  }

  // Returns the rows from the most recent upstream step that produced data.
  // "Most recent upstream" = highest position less than `currentPosition` that has data.
  getUpstreamRows(currentPosition: number): unknown[] {
    let rows: unknown[] = []
    for (let p = currentPosition - 1; p >= 1; p--) {
      const out = this.outputs.get(p)
      if (out && out.length > 0) { rows = out; break }
    }
    return rows
  }
}
```

**FieldMappingPicker** (Phase 1.6 UI component, already built) reads from `getUpstreamRows` — for linear flows, this is effectively the immediately previous step's output.

**Reordering:** If a user drags a `sheets.*` step to position 2 and the `fb.*` step to position 3, the saved scenario shows an inline validation warning (advisory, not a hard block). The executor runs steps in order: at runtime the Sheets step runs before the FB step, so `getUpstreamRows` returns `[]` → the Sheets step writes empty cells (no throw, no crash). This matches Zapier's behaviour.

**Validation rule (save-time, not run-time):** On `scenariosRouter.create` and `scenariosRouter.update`, inspect each `sheets.*` step's `config.mappedFields`. For each mapped field, check whether a prior `fb.*` step exists in the step list. If no prior `fb.*` step exists for any mapped field, return `validationWarning: "This step references fields that won't exist at runtime"` alongside the saved scenario. The builder UI surface already renders this warning — do not change the UI.

---

## Stage 0' — Sequential Setup (Orchestrator Only, ~45 min)

> **Run Stage 0' alone on the `main` branch (or `phase-2` branch — create it first). Do NOT spawn subagents until the Stage 0' commit is verified AND the human reports "manual setup done".**

This stage is entirely sequential: one person, one shell, no parallel work. It installs deps, creates the Docker Compose + Prisma schema, seeds mock data into the real DB, writes the crypto helper, and produces `docs/SETUP.md` so the human can do the manual third-party setup in parallel with development.

### 0'.1 — Branch and verify

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
Set-Location $root
git checkout main
git pull
git describe --tags --abbrev=0
# MUST output: phase-1.6-done
# If not, ABORT. Phase 1.6 is not finished.
git checkout -b phase-2
```

If `git describe` does not show `phase-1.6-done`, **STOP** — Phase 1.6 has not been tagged.

### 0'.2 — Add dependencies

```powershell
pnpm add @prisma/client next-auth@beta @auth/prisma-adapter googleapis facebook-nodejs-business-sdk jose zod superjson
pnpm add -D prisma vitest @types/node tsx
```

**Purpose of each dep:**
- `@prisma/client` — generated ORM client, queries the real Postgres DB
- `next-auth@beta` — NextAuth v5 (App Router story; `auth()` helper + `PrismaAdapter`)
- `@auth/prisma-adapter` — NextAuth adapter for Prisma (stores `Account`, `Session`, `User`)
- `googleapis` — Google Sheets API client (used by Agent B)
- `facebook-nodejs-business-sdk` — Facebook Marketing API client (used by Agent C)
- `jose` — JOSE crypto library for AES-256-GCM token encryption
- `zod` — runtime input validation at API boundaries (already in project; confirm version ≥ 3.22)
- `superjson` — already in project; confirm it's present
- `prisma` (dev) — Prisma CLI for `migrate dev`, `generate`, `studio`
- `vitest` (dev) — unit test runner for `tests/executor.test.ts`
- `@types/node` (dev) — Node type definitions for worker scripts
- `tsx` (dev) — TypeScript executor for `worker/index.ts` and seed scripts

### 0'.3 — Docker Compose for Postgres

Create `compose.yml` at the repo root with this exact content:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: automation-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: automation
      POSTGRES_PASSWORD: automation
      POSTGRES_DB: automation
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Add these scripts to `package.json` (merge with existing scripts, do not replace):

```json
{
  "db:up": "docker compose up -d",
  "db:down": "docker compose down",
  "db:reset": "docker compose down -v && docker compose up -d",
  "db:migrate": "prisma migrate dev",
  "db:seed:mock": "tsx prisma/seed-mock.ts",
  "db:studio": "prisma studio",
  "worker": "tsx worker/index.ts",
  "test": "vitest run"
}
```

**Verify:** `pnpm db:up` — Docker Desktop must be running. Container `automation-postgres` should appear in `docker ps`. Port 5432 must be free on the host.

**If port 5432 is already in use:** Check `netstat -ano | Select-String "5432"`. If another Postgres instance is running natively, either stop it or change the port mapping in `compose.yml` to `"5433:5432"` and update `DATABASE_URL` in `.env.example` to use port 5433.

### 0'.4 — Prisma schema

Create `prisma/schema.prisma` with this exact content (paste verbatim — do not summarise or restructure):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── NextAuth models ─────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  allowlisted   Boolean   @default(false)
  timezone      String    @default("Asia/Tashkent")
  theme         String    @default("system")
  createdAt     DateTime  @default(now())

  accounts         Account[]
  sessions         Session[]
  oauthConnections OAuthConnection[]
  adAccounts       AdAccount[]
  scenarios        Scenario[]
  runs             Run[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Domain models ───────────────────────────────────────────────────────────

model OAuthConnection {
  id           String           @id @default(cuid())
  userId       String
  provider     Provider
  status       ConnectionStatus
  email        String?
  externalId   String?
  accessToken  String           @db.Text
  refreshToken String?          @db.Text
  scope        String?
  expiresAt    DateTime?
  connectedAt  DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
}

enum Provider {
  GOOGLE_SHEETS
  FACEBOOK
}

enum ConnectionStatus {
  CONNECTED
  EXPIRED
  DISCONNECTED
}

model AdAccount {
  id              String    @id @default(cuid())
  userId          String
  fbAccountId     String
  label           String
  enabled         Boolean   @default(true)
  levels          AdLevel[]
  metrics         String[]
  dateWindowDays  Int
  spreadsheetId   String
  campaignTabName String    @default("Campaigns")
  adTabName       String    @default("Ads")
  cronExpression  String
  timezone        String    @default("Asia/Tashkent")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenarios Scenario[]

  @@unique([userId, fbAccountId])
}

enum AdLevel {
  CAMPAIGN
  AD
}

model Scenario {
  id            String      @id @default(cuid())
  userId        String
  name          String
  kind          ScenarioKind
  enabled       Boolean     @default(false)
  adAccountId   String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  lastRunAt     DateTime?
  lastRunStatus RunStatus?

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  adAccount AdAccount?     @relation(fields: [adAccountId], references: [id])
  steps     ScenarioStep[]
  runs      Run[]
}

enum ScenarioKind {
  QUICK_SETUP
  CUSTOM
}

model ScenarioStep {
  id         String   @id @default(cuid())
  scenarioId String
  position   Int
  moduleType String
  config     Json

  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@unique([scenarioId, position])
}

model Run {
  id                  String     @id @default(cuid())
  userId              String
  scenarioId          String
  trigger             RunTrigger
  status              RunStatus
  startedAt           DateTime   @default(now())
  finishedAt          DateTime?
  durationMs          Int?
  campaignRowsWritten Int        @default(0)
  adRowsWritten       Int        @default(0)
  errorMessage        String?
  sheetsUrl           String?

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  logs     RunLog[]
}

enum RunTrigger {
  MANUAL
  SCHEDULED
}

enum RunStatus {
  QUEUED
  RUNNING
  SUCCESS
  FAILED
}

model RunLog {
  id      String   @id @default(cuid())
  runId   String
  level   LogLevel
  message String
  meta    Json?
  ts      DateTime @default(now())

  run Run @relation(fields: [runId], references: [id], onDelete: Cascade)
}

enum LogLevel {
  INFO
  WARN
  ERROR
}

model AppSetting {
  key   String @id
  value String
}
```

### 0'.5 — Initial migration

```powershell
pnpm db:up                                         # Postgres must be running
pnpm prisma generate                               # generate the Prisma client
pnpm prisma migrate dev --name init                # create all tables
```

Expected output: `Your database is now in sync with your schema.` and a new file at `prisma/migrations/*/migration.sql`.

**If migration fails with "type already exists":** The DB has stale state from a previous attempt. Run `pnpm db:reset` (destroys and recreates the Docker volume) then retry from `pnpm db:up`.

### 0'.6 — Token encryption helper

Create `src/lib/crypto.ts` with this exact implementation:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALG = 'aes-256-gcm'
const KEY_HEX = process.env.TOKEN_ENC_KEY ?? ''

function getKey(): Buffer {
  if (KEY_HEX.length !== 64) {
    throw new Error(
      'TOKEN_ENC_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: openssl rand -hex 32'
    )
  }
  return Buffer.from(KEY_HEX, 'hex')
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: <iv_b64url>:<authTag_b64url>:<ciphertext_b64url>
 */
export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)                         // 96-bit IV for GCM
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

/**
 * Decrypt a ciphertext string produced by encryptToken.
 * Throws if the format is invalid or the tag does not match (tampered data).
 */
export function decryptToken(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted token format')
  const [ivB64, tagB64, dataB64] = parts as [string, string, string]
  const iv = Buffer.from(ivB64, 'base64url')
  const authTag = Buffer.from(tagB64, 'base64url')
  const data = Buffer.from(dataB64, 'base64url')
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}
```

**Smoke test (run manually in a Node REPL to verify before continuing):**
```javascript
process.env.TOKEN_ENC_KEY = 'a'.repeat(64)   // 64 hex chars = 32 bytes
const { encryptToken, decryptToken } = require('./src/lib/crypto.ts')
const ct = encryptToken('hello')
console.log(decryptToken(ct) === 'hello')    // must print: true
```

### 0'.7 — Prisma client singleton

Create `src/server/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

### 0'.8 — Seed script

Create `prisma/seed-mock.ts`. This script reads the existing mock constants from `src/server/mocks/data.ts` and inserts them into the real Postgres DB via Prisma. The mocks remain at `src/server/mocks/` for this import only — they are NOT on the runtime path. Runtime code must never import from `src/server/mocks/` after Phase 2 lands.

The seed script must be fully idempotent — running it twice must not create duplicate rows.

```typescript
import 'dotenv/config'
import { PrismaClient, Provider, ConnectionStatus, AdLevel, ScenarioKind, RunTrigger, RunStatus, LogLevel } from '@prisma/client'
import { MOCK_USER, MOCK_CONNECTIONS, MOCK_AD_ACCOUNTS, MOCK_SCENARIOS, MOCK_RUNS, MOCK_RUN_LOGS } from '../src/server/mocks/data'

const db = new PrismaClient()

async function main() {
  // 1. User
  await db.user.upsert({
    where: { email: MOCK_USER.email },
    create: {
      id: MOCK_USER.id,
      email: MOCK_USER.email,
      name: MOCK_USER.name,
      image: MOCK_USER.image,
      allowlisted: MOCK_USER.allowlisted,
      timezone: MOCK_USER.timezone,
      theme: MOCK_USER.theme,
    },
    update: {},
  })

  // 2. OAuthConnections (seeded as DISCONNECTED — user reconnects via real OAuth)
  for (const c of MOCK_CONNECTIONS) {
    const provider: Provider = c.provider === 'google' ? Provider.GOOGLE_SHEETS : Provider.FACEBOOK
    await db.oAuthConnection.upsert({
      where: { userId_provider: { userId: MOCK_USER.id, provider } },
      create: {
        id: c.id,
        userId: MOCK_USER.id,
        provider,
        status: ConnectionStatus.DISCONNECTED,
        email: c.email,
        externalId: null,
        accessToken: 'PLACEHOLDER_RECONNECT_REQUIRED',
        refreshToken: null,
        expiresAt: null,
      },
      update: {},
    })
  }

  // 3. AdAccounts
  for (const a of MOCK_AD_ACCOUNTS) {
    await db.adAccount.upsert({
      where: { userId_fbAccountId: { userId: MOCK_USER.id, fbAccountId: a.fbAccountId } },
      create: {
        id: a.id,
        userId: MOCK_USER.id,
        fbAccountId: a.fbAccountId,
        label: a.label,
        enabled: a.enabled,
        levels: a.levels.map(l => l as AdLevel),
        metrics: a.metrics,
        dateWindowDays: a.dateWindowDays,
        spreadsheetId: a.spreadsheetId,
        campaignTabName: a.campaignTabName,
        adTabName: a.adTabName,
        cronExpression: a.cronExpression,
        timezone: a.timezone,
      },
      update: {},
    })
  }

  // 4. Scenarios + Steps
  for (const s of MOCK_SCENARIOS) {
    await db.scenario.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        userId: MOCK_USER.id,
        name: s.name,
        kind: s.kind as ScenarioKind,
        enabled: s.enabled,
        adAccountId: null,
        lastRunAt: s.lastRunAt,
        lastRunStatus: s.lastRunStatus
          ? (s.lastRunStatus.toUpperCase() as RunStatus)
          : null,
      },
      update: {},
    })
    for (const step of s.steps) {
      await db.scenarioStep.upsert({
        where: { scenarioId_position: { scenarioId: s.id, position: step.position } },
        create: {
          id: step.id,
          scenarioId: s.id,
          position: step.position,
          moduleType: step.moduleType,
          config: step.config,
        },
        update: {},
      })
    }
  }

  // 5. Runs
  for (const r of MOCK_RUNS) {
    await db.run.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        userId: MOCK_USER.id,
        scenarioId: r.scenarioId,
        trigger: r.trigger.toUpperCase() as RunTrigger,
        status: r.status.toUpperCase() as RunStatus,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs: r.durationMs,
        campaignRowsWritten: r.campaignRowsWritten ?? 0,
        adRowsWritten: r.adRowsWritten ?? 0,
        errorMessage: r.errorMessage,
        sheetsUrl: r.sheetsUrl,
      },
      update: {},
    })
  }

  // 6. RunLogs
  for (const l of MOCK_RUN_LOGS) {
    await db.runLog.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        runId: l.runId,
        level: l.level as LogLevel,
        message: l.message,
        meta: l.meta ?? undefined,
        ts: l.timestamp,
      },
      update: {},
    })
  }

  console.log('Seeded: 1 user, 3 ad accounts, 7 scenarios, 30 runs, logs')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
```

### 0'.9 — Env variables

Create `.env.example` at the repo root:

```dotenv
# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://automation:automation@localhost:5432/automation"

# ─── NextAuth (login session) ─────────────────────────────────────────────────
NEXTAUTH_SECRET="<generate: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# ─── Google OAuth — Login (NextAuth provider) ─────────────────────────────────
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# ─── Google OAuth — Sheets data source (separate scopes, separate consent) ────
GOOGLE_OAUTH_SHEETS_CLIENT_ID="..."
GOOGLE_OAUTH_SHEETS_CLIENT_SECRET="..."

# ─── Facebook OAuth — ad data source ─────────────────────────────────────────
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."

# ─── Token encryption ─────────────────────────────────────────────────────────
# 64-character hex string = 32 bytes AES-256 key
# Generate: openssl rand -hex 32
# On Windows PowerShell (no openssl needed):
#   [System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) -replace '-',''
TOKEN_ENC_KEY="..."

# ─── Allowlist ────────────────────────────────────────────────────────────────
ALLOWLIST_EMAIL="jumanovsamandar005@gmail.com"

# ─── Worker behaviour ─────────────────────────────────────────────────────────
WORKER_ENABLED="true"
WORKER_TICK_INTERVAL_MS="60000"

# ─── Facebook API version ─────────────────────────────────────────────────────
FB_GRAPH_API_VERSION="v22.0"
```

Verify that `.env` is already in `.gitignore`. If not, add it.

Add `prisma/schema.prisma` directive to load env file:
```
# In prisma/schema.prisma datasource block — already uses env("DATABASE_URL"), which is fine.
# No additional config needed; dotenv/config is loaded in worker and seed scripts explicitly.
```

### 0'.10 — Write `docs/SETUP.md`

The full manual setup guide already exists at `docs/SETUP.md` from a prior draft. **Overwrite it** with the full content provided in this playbook's companion file `PROMPT_PHASE2_BUILD.md → Appendix: SETUP.md content`. The companion file's SETUP.md section is the authoritative version.

See the separate `docs/SETUP.md` file for the complete content — it is written as a standalone document the human follows independently.

### 0'.11 — Typecheck and commit

```powershell
pnpm prisma generate         # ensure client types are current
pnpm typecheck               # must exit 0
pnpm lint                    # must exit 0
git add compose.yml package.json prisma/ src/lib/crypto.ts src/server/db.ts docs/SETUP.md .env.example
git commit -m "phase 2 stage 0': prisma schema, docker compose, crypto, db singleton, seed script, SETUP.md, env example"
```

**Stage 0' acceptance criteria:**
- [ ] `compose.yml` exists at repo root; `pnpm db:up` brings up container `automation-postgres` on port 5432
- [ ] `prisma migrate dev` succeeds; all 11 models + 9 enums present in the schema
- [ ] `pnpm db:seed:mock` runs to completion and prints the "Seeded" line
- [ ] `src/lib/crypto.ts` round-trips AES-GCM correctly (smoke test above)
- [ ] `src/server/db.ts` exports `db` as a singleton `PrismaClient`
- [ ] `.env.example` lists all 11 required env vars
- [ ] `docs/SETUP.md` exists and is complete (sections 1–5)
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Commit at HEAD of `phase-2` branch

**HARD STOP after Stage 0' commit. Wait for human to complete manual setup (docs/SETUP.md sections 1–4 + report back "manual setup done"). Do NOT dispatch subagents until that confirmation arrives.**

---

## Stage 1' — Parallel Subagents (4)

Worktree setup (orchestrator runs this after the "manual setup done" confirmation):

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"

git -C $root worktree add .worktrees/auth     phase2/nextauth
git -C $root worktree add .worktrees/sheets   phase2/google-sheets-integration
git -C $root worktree add .worktrees/fb       phase2/facebook-integration
git -C $root worktree add .worktrees/exec     phase2/executor-and-worker
```

Each agent runs in its own worktree. Branches named `phase2/<slug>`. Exclusive file ownership — if you need to edit a file that's in another agent's list, stop and escalate to the orchestrator.

**Shared-file conflict resolution — `src/server/api/routers/connections.ts`:**
Agent B (Google Sheets) and Agent C (Facebook) both need to add real procedures to `connections.ts`. To avoid a merge conflict:
- Agent B writes the complete `connections.ts` file, including Google procedures AND placeholder stubs for Facebook procedures (marked with `// AGENT-C-TODO`).
- Agent C, when it merges after Agent B, reads Agent B's version and replaces the `// AGENT-C-TODO` stubs with real Facebook implementations.
- Orchestrator must merge Agent B before Agent C. See Stage 2'.1 for exact merge order.

---

### Agent A — `NextAuth-Agent`

**Worktree:** `.worktrees/auth`
**Branch:** `phase2/nextauth`

**Files this agent owns exclusively:**
- `src/server/auth.ts` (NEW)
- `src/app/api/auth/[...nextauth]/route.ts` (NEW)
- `src/middleware.ts` (NEW or existing — check; if exists, overwrite)
- `src/app/login/page.tsx` (EDIT — replace mocked Google button with real `signIn('google')`)
- `src/app/(dashboard)/layout.tsx` (EDIT — add real `auth()` call for user context)
- `src/server/api/trpc.ts` (EDIT — replace mock session middleware with real `auth()`)
- `src/server/api/routers/auth.ts` (EDIT — replace `getMockSession` with real `auth()`)
- `src/server/api/routers/settings.ts` (EDIT — replace `MOCK_USER` with real DB user)

**Do NOT touch:** any file in `src/components/`, `src/server/mocks/` (read-only for seed only), or any other router file.

**What to build:**

**`src/server/auth.ts`** — NextAuth v5 config:

```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '~/server/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Enforce single-user allowlist
      if (user.email !== process.env.ALLOWLIST_EMAIL) return false
      // Ensure allowlisted flag is set in DB
      if (user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { allowlisted: true },
        }).catch(() => null) // user row may not exist yet on first login
      }
      return true
    },
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({ where: { id: user.id } })
      if (dbUser) {
        session.user.id = dbUser.id
        session.user.timezone = dbUser.timezone
        session.user.theme = dbUser.theme as 'light' | 'dark' | 'system'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
```

**`src/app/api/auth/[...nextauth]/route.ts`:**

```typescript
import { handlers } from '~/server/auth'
export const { GET, POST } = handlers
```

**`src/middleware.ts`** — protect dashboard routes:

```typescript
import { auth } from '~/server/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuth = !!req.auth

  const protectedPaths = ['/connections', '/scenarios', '/runs', '/ad-accounts', '/settings']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !isAuth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**`src/server/api/trpc.ts`** — add an `authedProcedure`:

Read the existing `src/server/api/trpc.ts`. Add the following after `publicProcedure`:

```typescript
import { auth } from '~/server/auth'
import { TRPCError } from '@trpc/server'

export const authedProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ next }) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    return next({ ctx: { session, userId: session.user.id } })
  })
```

Replace all `publicProcedure` usages in router files **that require authentication** with `authedProcedure`. `modules.list` and `auth.getSession` may remain public. Everything else — `connections.*`, `adAccounts.*`, `scenarios.*`, `runs.*`, `runLogs.*`, `settings.*`, `fb.*` — should use `authedProcedure`.

Note: Agents B, C, and D will reference `authedProcedure` in their router rewrites. Ensure it is exported from `src/server/api/trpc.ts`.

**`src/app/login/page.tsx`** — replace the mock Google button. Read the existing component. Replace the mock `signIn` call with:

```tsx
import { signIn } from '~/server/auth'
// In the form / button handler:
await signIn('google', { redirectTo: '/connections' })
```

**`src/server/api/routers/auth.ts`** — replace `getMockSession` with real auth:

```typescript
import { auth } from '~/server/auth'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async () => {
    const session = await auth()
    if (!session?.user) return null
    return session
  }),
})
```

**`src/server/api/routers/settings.ts`** — replace MOCK_USER with real DB:

```typescript
import { db } from '~/server/db'
import { authedProcedure, createTRPCRouter } from '~/server/api/trpc'
import { z } from 'zod'

export const settingsRouter = createTRPCRouter({
  get: authedProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } })
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      allowlisted: user.allowlisted,
      timezone: user.timezone,
      theme: user.theme as 'light' | 'dark' | 'system',
      createdAt: user.createdAt,
    }
  }),
  updateTheme: authedProcedure
    .input(z.object({ theme: z.enum(['light', 'dark', 'system']) }))
    .mutation(async ({ ctx, input }) => {
      await db.user.update({ where: { id: ctx.userId }, data: { theme: input.theme } })
      return { theme: input.theme }
    }),
  updateTimezone: authedProcedure
    .input(z.object({ timezone: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.user.update({ where: { id: ctx.userId }, data: { timezone: input.timezone } })
      return { timezone: input.timezone }
    }),
  deleteAllData: authedProcedure.mutation(async ({ ctx }) => {
    await db.scenario.deleteMany({ where: { userId: ctx.userId } })
    await db.run.deleteMany({ where: { userId: ctx.userId } })
    return { ok: true as const }
  }),
})
```

**Grep for remaining `getMockSession` references:**

After edits, run:
```powershell
Select-String -Path "src\**\*" -Pattern "getMockSession" -Recurse
```
There must be zero matches outside `src/server/mocks/session.ts`.

**Acceptance criteria for Agent A:**
- [ ] Visiting `/scenarios` without a session redirects to `/login?next=/scenarios`
- [ ] Clicking "Sign in with Google" on `/login` opens real Google consent screen
- [ ] After consent with `ALLOWLIST_EMAIL`, user lands at `/connections`
- [ ] A second Google account that is NOT `ALLOWLIST_EMAIL` is rejected — returns to `/login` with an error
- [ ] `authedProcedure` throws `UNAUTHORIZED` for unauthenticated tRPC calls
- [ ] `settings.get` returns the real DB user row (not mock)
- [ ] `auth.getSession` returns the real NextAuth session or `null`
- [ ] Zero remaining references to `getMockSession` in non-mock files
- [ ] Logout button (`signOut({ callbackUrl: '/login' })`) returns to `/login`
- [ ] `pnpm typecheck` exits 0 in this worktree

---

### Agent B — `Google-Sheets-Integration-Agent`

**Worktree:** `.worktrees/sheets`
**Branch:** `phase2/google-sheets-integration`

**Files this agent owns exclusively:**
- `src/integrations/google/sheets-client.ts` (NEW)
- `src/integrations/google/oauth.ts` (NEW)
- `src/app/api/oauth/google/route.ts` (NEW)
- `src/app/api/oauth/google/callback/route.ts` (NEW)
- `src/server/api/routers/connections.ts` (FULL REWRITE — includes Facebook stubs for Agent C)

**Do NOT touch:** any component, any other router file, `src/server/auth.ts`.

**What to build:**

**`src/integrations/google/oauth.ts`** — OAuth flow helpers:

```typescript
import { db } from '~/server/db'
import { Provider, ConnectionStatus } from '@prisma/client'
import { encryptToken, decryptToken } from '~/lib/crypto'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_SHEETS_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SHEETS_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/oauth/google/callback`
  )
}

export function getAuthorizationUrl(state: string): string {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',   // force refresh_token on every auth
    state,
  })
}

export async function exchangeCode(code: string, userId: string): Promise<void> {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  if (!tokens.access_token) throw new Error('No access_token in Google token response')

  // Get user's Google email for display
  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data: profile } = await oauth2.userinfo.get()

  await db.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider: Provider.GOOGLE_SHEETS } },
    create: {
      userId,
      provider: Provider.GOOGLE_SHEETS,
      status: ConnectionStatus.CONNECTED,
      email: profile.email ?? null,
      externalId: profile.id ?? null,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      scope: SCOPES.join(' '),
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      status: ConnectionStatus.CONNECTED,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      email: profile.email ?? null,
    },
  })
}

/**
 * Returns an authenticated Google OAuth2 client for the given userId.
 * Automatically refreshes the access token if it is expired.
 */
export async function getAuthedClient(userId: string) {
  const conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: Provider.GOOGLE_SHEETS } },
  })
  if (!conn || conn.status === ConnectionStatus.DISCONNECTED) {
    throw new Error('Google Sheets not connected. Please reconnect from /connections.')
  }
  const client = getOAuthClient()
  const accessToken = decryptToken(conn.accessToken)
  const refreshToken = conn.refreshToken ? decryptToken(conn.refreshToken) : undefined
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  // Refresh proactively if expiring within 5 min
  if (conn.expiresAt && conn.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken()
    client.setCredentials(credentials)
    await db.oAuthConnection.update({
      where: { userId_provider: { userId, provider: Provider.GOOGLE_SHEETS } },
      data: {
        accessToken: encryptToken(credentials.access_token!),
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        status: ConnectionStatus.CONNECTED,
      },
    })
  }
  return client
}
```

**`src/integrations/google/sheets-client.ts`** — Sheets API wrapper:

```typescript
import { google } from 'googleapis'
import { getAuthedClient } from './oauth'

/**
 * Appends rows to a tab. Creates the tab if it doesn't exist.
 * Returns the number of rows appended.
 */
export async function appendRows(
  userId: string,
  spreadsheetId: string,
  tabName: string,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0
  const auth = await getAuthedClient(userId)
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureTabExists(sheets, spreadsheetId, tabName)

  const headers = Object.keys(rows[0]!)
  const values = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))]

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return rows.length
}

/**
 * Upserts rows into a tab keyed on keyFields.
 * Reads existing rows, merges by key, writes back.
 * Creates the tab if it doesn't exist.
 * Returns the number of rows written (created + updated).
 */
export async function upsertRows(
  userId: string,
  spreadsheetId: string,
  tabName: string,
  keyFields: string[],
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0
  const auth = await getAuthedClient(userId)
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureTabExists(sheets, spreadsheetId, tabName)

  const headers = Object.keys(rows[0]!)
  const existing = await readTab(sheets, spreadsheetId, tabName)

  // Build a map from composite key → row index in existing
  const keyOf = (row: Record<string, unknown>) => keyFields.map(k => String(row[k] ?? '')).join('|')
  const existingMap = new Map<string, Record<string, unknown>>()
  for (const row of existing) existingMap.set(keyOf(row), row)

  for (const row of rows) existingMap.set(keyOf(row), { ...existingMap.get(keyOf(row)), ...row })

  const merged = Array.from(existingMap.values())
  const allHeaders = Array.from(new Set([...headers, ...Object.keys(merged[0] ?? {})]))
  const values = [allHeaders, ...merged.map(r => allHeaders.map(h => r[h] ?? ''))]

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return merged.length
}

async function ensureTabExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some(s => s.properties?.title === tabName)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    })
  }
}

async function readTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
): Promise<Record<string, unknown>[]> {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A1:ZZZ`,
  })
  const rows = resp.data.values ?? []
  if (rows.length < 2) return []
  const [headers, ...data] = rows as string[][]
  return data.map(row => Object.fromEntries((headers ?? []).map((h, i) => [h, row[i] ?? ''])))
}
```

**`src/app/api/oauth/google/route.ts`** — initiate OAuth:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '~/server/auth'
import { getAuthorizationUrl } from '~/integrations/google/oauth'
import { randomBytes } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect('/login')

  const state = `${session.user.id}:${randomBytes(16).toString('hex')}`
  const url = getAuthorizationUrl(state)
  return NextResponse.redirect(url)
}
```

**`src/app/api/oauth/google/callback/route.ts`** — handle callback:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '~/server/auth'
import { exchangeCode } from '~/integrations/google/oauth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect('/login')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/connections?error=google_denied', req.url))
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/connections?error=google_invalid', req.url))
  }

  // Validate that the userId in state matches the current session
  const [stateUserId] = state.split(':')
  if (stateUserId !== session.user.id) {
    return NextResponse.redirect(new URL('/connections?error=google_state_mismatch', req.url))
  }

  try {
    await exchangeCode(code, session.user.id)
    return NextResponse.redirect(new URL('/connections?success=google', req.url))
  } catch (err) {
    console.error('[Google OAuth callback error]', err)
    return NextResponse.redirect(new URL('/connections?error=google_exchange_failed', req.url))
  }
}
```

**`src/server/api/routers/connections.ts`** — full rewrite:

This file contains BOTH Google and Facebook procedures. Agent B writes the Google implementations and stubs for Facebook. Agent C fills in the Facebook stubs.

```typescript
import { z } from 'zod'
import { db } from '~/server/db'
import { Provider, ConnectionStatus } from '@prisma/client'
import { authedProcedure, createTRPCRouter } from '~/server/api/trpc'
import { decryptToken, encryptToken } from '~/lib/crypto'
import { getAuthedClient } from '~/integrations/google/oauth'

// ─── Shared helpers ──────────────────────────────────────────────────────────

function toFrontendConnection(conn: {
  id: string
  provider: Provider
  status: ConnectionStatus
  email: string | null
  expiresAt: Date | null
  connectedAt: Date
}) {
  return {
    id: conn.id,
    provider: conn.provider === Provider.GOOGLE_SHEETS ? 'google' as const : 'facebook' as const,
    status: conn.status === ConnectionStatus.CONNECTED ? 'connected' as const
          : conn.status === ConnectionStatus.EXPIRED ? 'expired' as const
          : 'disconnected' as const,
    email: conn.email,
    expiresAt: conn.expiresAt,
    connectedAt: conn.connectedAt,
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const connectionsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const conns = await db.oAuthConnection.findMany({ where: { userId: ctx.userId } })
    return conns.map(toFrontendConnection)
  }),

  connect: authedProcedure
    .input(z.object({ provider: z.enum(['google', 'facebook']) }))
    .mutation(async ({ ctx, input }) => {
      // This procedure returns the OAuth initiation URL.
      // The actual token storage happens in the OAuth callback routes.
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      const url = input.provider === 'google'
        ? `${baseUrl}/api/oauth/google`
        : `${baseUrl}/api/oauth/facebook`
      return { redirectUrl: url }
    }),

  disconnect: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.oAuthConnection.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { status: ConnectionStatus.DISCONNECTED },
      })
      return { id: input.id, status: 'disconnected' as const }
    }),

  refresh: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await db.oAuthConnection.findFirst({
        where: { id: input.id, userId: ctx.userId },
      })
      if (!conn) throw new Error(`Connection ${input.id} not found`)

      if (conn.provider === Provider.GOOGLE_SHEETS) {
        // Force a token refresh by calling getAuthedClient (it auto-refreshes if expiring)
        await getAuthedClient(ctx.userId)
        const updated = await db.oAuthConnection.findUniqueOrThrow({ where: { id: conn.id } })
        return toFrontendConnection({ ...updated, connectedAt: updated.connectedAt })
      }

      // AGENT-C-TODO: Facebook refresh logic goes here
      return toFrontendConnection({ ...conn, connectedAt: conn.connectedAt })
    }),
})
```

**Acceptance criteria for Agent B:**
- [ ] `/connections` Google Sheets card → clicking Connect initiates real Google OAuth flow (browser redirects to Google consent screen)
- [ ] After consent, callback stores encrypted tokens in `OAuthConnection` (verify in `pnpm db:studio`: `accessToken` column has ciphertext, NOT plaintext)
- [ ] `/connections` shows card status "Connected" after successful OAuth
- [ ] Disconnecting sets `status = DISCONNECTED` in DB
- [ ] `appendRows` called with a real Sheet ID + test data actually appends rows to the Sheet
- [ ] Token refresh works: after manually setting `expiresAt` to a past date in the DB, calling `getAuthedClient` refreshes and updates the row
- [ ] `pnpm typecheck` exits 0 in this worktree

---

### Agent C — `Facebook-Integration-Agent`

**Worktree:** `.worktrees/fb`
**Branch:** `phase2/facebook-integration`

**Files this agent owns exclusively:**
- `src/integrations/facebook/graph-client.ts` (NEW)
- `src/integrations/facebook/oauth.ts` (NEW)
- `src/app/api/oauth/facebook/route.ts` (NEW)
- `src/app/api/oauth/facebook/callback/route.ts` (NEW)
- `src/server/api/routers/fb.ts` (FULL REWRITE)
- The Facebook sections of `src/server/api/routers/connections.ts` (fill in `// AGENT-C-TODO` stubs — Agent B must be merged first)

**Do NOT touch:** any component, any Google integration files, any other router file.

**Important:** Agent C must read Agent B's version of `connections.ts` and replace the stubs. Do NOT overwrite Google procedures.

**What to build:**

**`src/integrations/facebook/oauth.ts`** — FB OAuth helpers:

```typescript
import { db } from '~/server/db'
import { Provider, ConnectionStatus } from '@prisma/client'
import { encryptToken, decryptToken } from '~/lib/crypto'

const FB_VERSION = process.env.FB_GRAPH_API_VERSION ?? 'v22.0'
const APP_ID = process.env.FACEBOOK_APP_ID!
const APP_SECRET = process.env.FACEBOOK_APP_SECRET!

export function getAuthorizationUrl(state: string): string {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/facebook/callback`
  const scopes = 'ads_read,read_insights'
  return (
    `https://www.facebook.com/${FB_VERSION}/dialog/oauth` +
    `?client_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encopes}` +
    `&state=${state}`
  )
}

/**
 * Exchange a short-lived code for a long-lived (~60 day) user access token.
 * Stores the long-lived token encrypted in OAuthConnection.
 */
export async function exchangeCode(code: string, userId: string): Promise<void> {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/facebook/callback`

  // Step 1: short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/${FB_VERSION}/oauth/access_token` +
    `?client_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&client_secret=${APP_SECRET}` +
    `&code=${code}`,
  )
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } }
  if (!tokenData.access_token) {
    throw new Error(`FB token exchange failed: ${tokenData.error?.message ?? 'unknown'}`)
  }

  // Step 2: long-lived token
  const longRes = await fetch(
    `https://graph.facebook.com/${FB_VERSION}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}` +
    `&client_secret=${APP_SECRET}` +
    `&fb_exchange_token=${tokenData.access_token}`,
  )
  const longData = (await longRes.json()) as { access_token?: string; expires_in?: number; error?: { message: string } }
  if (!longData.access_token) {
    throw new Error(`FB long-lived token exchange failed: ${longData.error?.message ?? 'unknown'}`)
  }

  // Step 3: get FB user info
  const meRes = await fetch(
    `https://graph.facebook.com/${FB_VERSION}/me?fields=id,email&access_token=${longData.access_token}`,
  )
  const me = (await meRes.json()) as { id?: string; email?: string }

  const expiresAt = longData.expires_in
    ? new Date(Date.now() + longData.expires_in * 1000)
    : null

  await db.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider: Provider.FACEBOOK } },
    create: {
      userId,
      provider: Provider.FACEBOOK,
      status: ConnectionStatus.CONNECTED,
      email: me.email ?? null,
      externalId: me.id ?? null,
      accessToken: encryptToken(longData.access_token),
      refreshToken: null,   // FB long-lived tokens are not refreshed; user reauthorizes
      scope: 'ads_read,read_insights',
      expiresAt,
    },
    update: {
      status: ConnectionStatus.CONNECTED,
      accessToken: encryptToken(longData.access_token),
      expiresAt,
      email: me.email ?? null,
      externalId: me.id ?? null,
    },
  })
}

/** Get the decrypted access token for a user's FB connection. */
export async function getFbAccessToken(userId: string): Promise<string> {
  const conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: Provider.FACEBOOK } },
  })
  if (!conn || conn.status !== ConnectionStatus.CONNECTED) {
    throw new Error('Facebook not connected. Please reconnect from /connections.')
  }
  return decryptToken(conn.accessToken)
}
```

Fix the typo in the code above: `const scopes = ...` and the URL uses `encopes` — correct to `encodeURIComponent(scopes)` before committing.

**`src/app/api/oauth/facebook/route.ts`:**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '~/server/auth'
import { getAuthorizationUrl } from '~/integrations/facebook/oauth'
import { randomBytes } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect('/login')

  const state = `${session.user.id}:${randomBytes(16).toString('hex')}`
  const url = getAuthorizationUrl(state)
  return NextResponse.redirect(url)
}
```

**`src/app/api/oauth/facebook/callback/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '~/server/auth'
import { exchangeCode } from '~/integrations/facebook/oauth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect('/login')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error) return NextResponse.redirect(new URL('/connections?error=fb_denied', req.url))
  if (!code || !state) return NextResponse.redirect(new URL('/connections?error=fb_invalid', req.url))

  const [stateUserId] = state.split(':')
  if (stateUserId !== session.user.id) {
    return NextResponse.redirect(new URL('/connections?error=fb_state_mismatch', req.url))
  }

  try {
    await exchangeCode(code, session.user.id)
    return NextResponse.redirect(new URL('/connections?success=facebook', req.url))
  } catch (err) {
    console.error('[Facebook OAuth callback error]', err)
    return NextResponse.redirect(new URL('/connections?error=fb_exchange_failed', req.url))
  }
}
```

**`src/integrations/facebook/graph-client.ts`** — Marketing API wrapper:

```typescript
import { getFbAccessToken } from './oauth'

const FB_VERSION = process.env.FB_GRAPH_API_VERSION ?? 'v22.0'
const BASE = `https://graph.facebook.com/${FB_VERSION}`

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightLevel = 'account' | 'campaign' | 'ad'

export interface InsightsQuery {
  fbAccountId: string   // e.g. "act_123456789"
  level: InsightLevel
  metrics: string[]
  dateWindowDays: number
}

export type InsightRow = Record<string, string | number>

// ─── Stub mode ───────────────────────────────────────────────────────────────
// When FACEBOOK_APP_REVIEW_PENDING=true, return sampleOutput shapes instead of
// calling the real API. This allows development before App Review is complete.

function isStubMode(): boolean {
  return process.env.FACEBOOK_APP_REVIEW_PENDING === 'true'
}

function stubRows(metrics: string[], n = 3): InsightRow[] {
  return Array.from({ length: n }, (_, i) => ({
    date_start: new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10),
    account_id: 'act_stub_123',
    campaign_id: `stub_cmp_${i + 1}`,
    ad_id: `stub_ad_${i + 1}`,
    ...Object.fromEntries(metrics.map(m => [m, Math.floor(Math.random() * 1000)])),
  }))
}

// ─── Real API calls ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: { message: res.statusText } }))) as { error: { message: string } }
    throw new Error(`FB Graph API error: ${err.error?.message ?? res.statusText}`)
  }
  return res.json() as Promise<T>
}

function buildInsightsUrl(fbAccountId: string, level: InsightLevel, metrics: string[], dateWindowDays: number): string {
  const fields = ['date_start', 'account_id', 'campaign_id', 'ad_id', ...metrics].join(',')
  const datePreset = dateWindowDays <= 7 ? 'last_7d' : dateWindowDays <= 14 ? 'last_14d' : 'last_30d'
  return (
    `${BASE}/${fbAccountId}/insights` +
    `?level=${level}` +
    `&fields=${fields}` +
    `&date_preset=${datePreset}` +
    `&limit=500`
  )
}

export async function getAccountInsights(userId: string, query: InsightsQuery): Promise<InsightRow[]> {
  if (isStubMode()) return stubRows(query.metrics)
  const token = await getFbAccessToken(userId)
  const url = buildInsightsUrl(query.fbAccountId, 'account', query.metrics, query.dateWindowDays)
  const data = await fetchJson<{ data: InsightRow[] }>(url, token)
  return data.data ?? []
}

export async function getCampaignInsights(userId: string, query: InsightsQuery): Promise<InsightRow[]> {
  if (isStubMode()) return stubRows(query.metrics)
  const token = await getFbAccessToken(userId)
  const url = buildInsightsUrl(query.fbAccountId, 'campaign', query.metrics, query.dateWindowDays)
  const data = await fetchJson<{ data: InsightRow[] }>(url, token)
  return data.data ?? []
}

export async function getAdInsights(userId: string, query: InsightsQuery): Promise<InsightRow[]> {
  if (isStubMode()) return stubRows(query.metrics)
  const token = await getFbAccessToken(userId)
  const url = buildInsightsUrl(query.fbAccountId, 'ad', query.metrics, query.dateWindowDays)
  const data = await fetchJson<{ data: InsightRow[] }>(url, token)
  return data.data ?? []
}

export async function listAdAccounts(userId: string): Promise<{ id: string; name: string }[]> {
  if (isStubMode()) {
    return [
      { id: 'act_stub_001', name: 'Stub Account — Dev Mode' },
      { id: 'act_stub_002', name: 'Stub Account 2 — Dev Mode' },
    ]
  }
  const token = await getFbAccessToken(userId)
  const url = `${BASE}/me/adaccounts?fields=account_id,name&limit=50`
  const data = await fetchJson<{ data: Array<{ id: string; account_id: string; name: string }> }>(url, token)
  return (data.data ?? []).map(a => ({ id: a.id, name: a.name }))
}
```

**`src/server/api/routers/fb.ts`** — replace mock:

```typescript
import { createTRPCRouter, authedProcedure } from '~/server/api/trpc'
import { listAdAccounts } from '~/integrations/facebook/graph-client'

export const fbRouter = createTRPCRouter({
  listAvailableAccounts: authedProcedure.query(async ({ ctx }) => {
    return listAdAccounts(ctx.userId)
  }),
})
```

**`connections.ts` — Facebook stubs replacement:**

After Agent B merges, read the merged `connections.ts`. Find the `// AGENT-C-TODO` comment in the `refresh` mutation. Replace with:

```typescript
// Facebook: tokens are long-lived and don't refresh via API.
// If the token is expired, surface EXPIRED status so UI prompts reconnect.
if (conn.expiresAt && conn.expiresAt < new Date()) {
  await db.oAuthConnection.update({
    where: { id: conn.id },
    data: { status: ConnectionStatus.EXPIRED },
  })
  return toFrontendConnection({ ...conn, status: ConnectionStatus.EXPIRED, connectedAt: conn.connectedAt })
}
return toFrontendConnection({ ...conn, connectedAt: conn.connectedAt })
```

**Acceptance criteria for Agent C:**
- [ ] `/connections` Facebook card → clicking Connect initiates real Facebook OAuth flow (browser redirects to Facebook consent screen for test user)
- [ ] After test user consent, callback stores encrypted long-lived token in `OAuthConnection`
- [ ] `/connections` shows Facebook card status "Connected"
- [ ] `fbRouter.listAvailableAccounts` returns the test user's real ad accounts (or stub accounts when `FACEBOOK_APP_REVIEW_PENDING=true`)
- [ ] Graph API errors (rate limit, invalid token) surface as thrown errors with descriptive messages
- [ ] Stub mode works: `FACEBOOK_APP_REVIEW_PENDING=true` returns shaped stub rows, does NOT call Graph API
- [ ] `pnpm typecheck` exits 0 in this worktree

---

### Agent D — `Executor-and-Worker-Agent`

**Worktree:** `.worktrees/exec`
**Branch:** `phase2/executor-and-worker`

**Files this agent owns exclusively:**
- `src/server/core/executor.ts` (NEW)
- `src/server/core/run-context.ts` (NEW)
- `src/server/core/module-handlers.ts` (NEW)
- `worker/index.ts` (EDIT or NEW — if existing file has content, read first)
- `worker/scheduler.ts` (NEW)
- `src/server/api/routers/scenarios.ts` (FULL REWRITE)
- `src/server/api/routers/runs.ts` (FULL REWRITE)
- `src/server/api/routers/runLogs.ts` (FULL REWRITE)
- `src/server/api/routers/adAccounts.ts` (FULL REWRITE)
- `tests/executor.test.ts` (NEW)

**Do NOT touch:** any component, any integration files (Agents B/C own those), `src/server/auth.ts`, `src/server/api/trpc.ts`, `connections.ts`, `fb.ts`.

**What to build:**

**`src/server/core/run-context.ts`:**

```typescript
export class RunContext {
  private outputs = new Map<number, unknown[]>()
  private meta = new Map<number, { durationMs: number; rowCount?: number }>()

  setOutput(position: number, rows: unknown[]): void {
    this.outputs.set(position, rows)
  }

  getOutput(position: number): unknown[] {
    return this.outputs.get(position) ?? []
  }

  setMeta(position: number, data: { durationMs: number; rowCount?: number }): void {
    this.meta.set(position, data)
  }

  getMeta(position: number): { durationMs: number; rowCount?: number } | undefined {
    return this.meta.get(position)
  }

  /**
   * Returns rows from the most recent upstream position that has data.
   * "Upstream" = any position < currentPosition.
   */
  getUpstreamRows(currentPosition: number): unknown[] {
    for (let p = currentPosition - 1; p >= 1; p--) {
      const rows = this.outputs.get(p)
      if (rows && rows.length > 0) return rows
    }
    return []
  }
}
```

**`src/server/core/executor.ts`:**

```typescript
import { db } from '~/server/db'
import { RunContext } from './run-context'
import { getHandler } from './module-handlers'
import { RunTrigger, RunStatus, LogLevel } from '@prisma/client'

export async function executeRun(
  scenarioId: string,
  trigger: 'MANUAL' | 'SCHEDULED',
  userId: string,
): Promise<string> {
  // 1. Load scenario + steps sorted by position
  const scenario = await db.scenario.findUniqueOrThrow({
    where: { id: scenarioId },
    include: { steps: { orderBy: { position: 'asc' } } },
  })

  // 2. Create Run row with RUNNING status
  const run = await db.run.create({
    data: {
      userId,
      scenarioId,
      trigger: trigger === 'MANUAL' ? RunTrigger.MANUAL : RunTrigger.SCHEDULED,
      status: RunStatus.RUNNING,
    },
  })

  const runStart = Date.now()
  const ctx = new RunContext()
  let campaignRowsWritten = 0
  let adRowsWritten = 0
  let sheetsUrl: string | null = null

  try {
    // 3. Execute each step in position order
    for (const step of scenario.steps) {
      const stepStart = Date.now()

      await db.runLog.create({
        data: {
          runId: run.id,
          level: LogLevel.INFO,
          message: `Step ${step.position} (${step.moduleType}) starting`,
        },
      })

      const handler = getHandler(step.moduleType)
      const result = await handler({
        step,
        context: ctx,
        userId,
        runId: run.id,
      })

      const stepDuration = Date.now() - stepStart

      if (result.rowCount !== undefined) {
        if (step.moduleType.includes('campaign')) campaignRowsWritten += result.rowCount
        if (step.moduleType.includes('ad') && !step.moduleType.includes('account')) adRowsWritten += result.rowCount
        if (step.moduleType.startsWith('sheets.')) {
          sheetsUrl = result.sheetsUrl ?? sheetsUrl
        }
      }

      ctx.setMeta(step.position, { durationMs: stepDuration, rowCount: result.rowCount })

      await db.runLog.create({
        data: {
          runId: run.id,
          level: LogLevel.INFO,
          message: `Step ${step.position} (${step.moduleType}) completed`,
          meta: { durationMs: stepDuration, rowCount: result.rowCount },
        },
      })
    }

    // 4. Mark SUCCESS
    const totalDuration = Date.now() - runStart
    await db.run.update({
      where: { id: run.id },
      data: {
        status: RunStatus.SUCCESS,
        finishedAt: new Date(),
        durationMs: totalDuration,
        campaignRowsWritten,
        adRowsWritten,
        sheetsUrl,
      },
    })
    await db.scenario.update({
      where: { id: scenarioId },
      data: { lastRunAt: new Date(), lastRunStatus: RunStatus.SUCCESS },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const totalDuration = Date.now() - runStart

    await db.runLog.create({
      data: {
        runId: run.id,
        level: LogLevel.ERROR,
        message: `Run failed: ${errorMessage}`,
        meta: { stack: err instanceof Error ? err.stack : null },
      },
    })
    await db.run.update({
      where: { id: run.id },
      data: {
        status: RunStatus.FAILED,
        finishedAt: new Date(),
        durationMs: totalDuration,
        errorMessage,
      },
    })
    await db.scenario.update({
      where: { id: scenarioId },
      data: { lastRunAt: new Date(), lastRunStatus: RunStatus.FAILED },
    })
  }

  return run.id
}
```

**`src/server/core/module-handlers.ts`** — one handler per module type:

```typescript
import { db } from '~/server/db'
import { RunContext } from './run-context'
import type { ScenarioStep } from '@prisma/client'
import { getAccountInsights, getCampaignInsights, getAdInsights } from '~/integrations/facebook/graph-client'
import { appendRows, upsertRows } from '~/integrations/google/sheets-client'

export type HandlerInput = {
  step: ScenarioStep
  context: RunContext
  userId: string
  runId: string
}

export type HandlerResult = {
  rowCount?: number
  sheetsUrl?: string
}

export type ModuleHandler = (input: HandlerInput) => Promise<HandlerResult>

function cfg<T = Record<string, unknown>>(step: ScenarioStep): T {
  return step.config as T
}

// ─── Trigger handlers (no-op — scheduling logic is in the worker) ─────────────

const triggerScheduleHandler: ModuleHandler = async () => ({})
const triggerManualHandler: ModuleHandler = async () => ({})

// ─── Facebook handlers ───────────────────────────────────────────────────────

const fbAccountInsightsHandler: ModuleHandler = async ({ step, context, userId }) => {
  const c = cfg<{ fbAccountId: string; dateWindowDays: number; metrics: string[] }>(step)
  const rows = await getAccountInsights(userId, {
    fbAccountId: c.fbAccountId,
    level: 'account',
    metrics: c.metrics,
    dateWindowDays: c.dateWindowDays,
  })
  context.setOutput(step.position, rows)
  return { rowCount: rows.length }
}

const fbCampaignInsightsHandler: ModuleHandler = async ({ step, context, userId }) => {
  const c = cfg<{ fbAccountId: string; dateWindowDays: number; metrics: string[] }>(step)
  const rows = await getCampaignInsights(userId, {
    fbAccountId: c.fbAccountId,
    level: 'campaign',
    metrics: c.metrics,
    dateWindowDays: c.dateWindowDays,
  })
  context.setOutput(step.position, rows)
  return { rowCount: rows.length }
}

const fbAdInsightsHandler: ModuleHandler = async ({ step, context, userId }) => {
  const c = cfg<{ fbAccountId: string; dateWindowDays: number; metrics: string[] }>(step)
  const rows = await getAdInsights(userId, {
    fbAccountId: c.fbAccountId,
    level: 'ad',
    metrics: c.metrics,
    dateWindowDays: c.dateWindowDays,
  })
  context.setOutput(step.position, rows)
  return { rowCount: rows.length }
}

// ─── Google Sheets handlers ───────────────────────────────────────────────────

const sheetsAppendHandler: ModuleHandler = async ({ step, context, userId }) => {
  const c = cfg<{
    spreadsheetId: string
    tabName: string
    mappedFields?: string[]
  }>(step)
  const upstreamRows = context.getUpstreamRows(step.position) as Record<string, unknown>[]
  const rows = c.mappedFields && c.mappedFields.length > 0
    ? upstreamRows.map(r => Object.fromEntries(c.mappedFields!.map(f => [f, r[f] ?? ''])))
    : upstreamRows
  const count = await appendRows(userId, c.spreadsheetId, c.tabName, rows)
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${c.spreadsheetId}`
  return { rowCount: count, sheetsUrl }
}

const sheetsUpsertHandler: ModuleHandler = async ({ step, context, userId }) => {
  const c = cfg<{
    spreadsheetId: string
    tabName: string
    keyFields: string[]
    mappedFields?: string[]
  }>(step)
  const upstreamRows = context.getUpstreamRows(step.position) as Record<string, unknown>[]
  const rows = c.mappedFields && c.mappedFields.length > 0
    ? upstreamRows.map(r => Object.fromEntries(c.mappedFields!.map(f => [f, r[f] ?? ''])))
    : upstreamRows
  const count = await upsertRows(userId, c.spreadsheetId, c.tabName, c.keyFields ?? [], rows)
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${c.spreadsheetId}`
  return { rowCount: count, sheetsUrl }
}

// ─── Handler registry ─────────────────────────────────────────────────────────

const HANDLERS: Record<string, ModuleHandler> = {
  'trigger.schedule': triggerScheduleHandler,
  'trigger.manual': triggerManualHandler,
  'fb.account_insights': fbAccountInsightsHandler,
  'fb.campaign_insights': fbCampaignInsightsHandler,
  'fb.ad_insights': fbAdInsightsHandler,
  'sheets.append': sheetsAppendHandler,
  'sheets.upsert': sheetsUpsertHandler,
}

export function getHandler(moduleType: string): ModuleHandler {
  const h = HANDLERS[moduleType]
  if (!h) throw new Error(`No handler registered for module type: ${moduleType}`)
  return h
}
```

**`src/server/api/routers/scenarios.ts`** — replace mock with real DB:

Key behavioral notes:
- `list` returns scenarios belonging to `ctx.userId` only
- `runNow` calls `executeRun` (non-blocking via `.catch(console.error)`, returns the run ID immediately so the UI can redirect to the run page)
- `testRun` calls `executeRun` and waits; returns per-step results from RunLogs
- Field mapping validation: after saving, check whether any `sheets.*` step's `mappedFields` reference fields not provided by a prior `fb.*` step; if so, return `validationWarning`

```typescript
import { z } from 'zod'
import { db } from '~/server/db'
import { ScenarioKind, RunStatus, RunTrigger } from '@prisma/client'
import { authedProcedure, createTRPCRouter } from '~/server/api/trpc'
import { executeRun } from '~/server/core/executor'

const ModuleTypeSchema = z.enum([
  'trigger.schedule', 'trigger.manual',
  'fb.account_insights', 'fb.campaign_insights', 'fb.ad_insights',
  'sheets.append', 'sheets.upsert',
])

const ScenarioStepInput = z.object({
  id: z.string().optional(),
  position: z.number().int().min(1),
  moduleType: ModuleTypeSchema,
  config: z.record(z.string(), z.unknown()),
})

function normalizeRunStatus(s: RunStatus | null): 'success' | 'failed' | null {
  if (s === RunStatus.SUCCESS) return 'success'
  if (s === RunStatus.FAILED) return 'failed'
  return null
}

function scenarioToFrontend(s: {
  id: string; userId: string; name: string; kind: ScenarioKind; enabled: boolean;
  lastRunAt: Date | null; lastRunStatus: RunStatus | null; createdAt: Date; updatedAt: Date;
  steps: Array<{ id: string; scenarioId: string; position: number; moduleType: string; config: unknown }>
}) {
  return {
    id: s.id, userId: s.userId, name: s.name,
    kind: s.kind as 'QUICK_SETUP' | 'CUSTOM',
    enabled: s.enabled,
    steps: s.steps.map(st => ({
      id: st.id, scenarioId: st.scenarioId, position: st.position,
      moduleType: st.moduleType, config: st.config as Record<string, unknown>,
    })),
    lastRunAt: s.lastRunAt,
    lastRunStatus: normalizeRunStatus(s.lastRunStatus),
    createdAt: s.createdAt, updatedAt: s.updatedAt,
  }
}

function validateFieldMappings(steps: Array<{ position: number; moduleType: string; config: Record<string, unknown> }>): string | null {
  const fbPositions = steps.filter(s => s.moduleType.startsWith('fb.')).map(s => s.position)
  for (const step of steps) {
    if (!step.moduleType.startsWith('sheets.')) continue
    const mappedFields = (step.config.mappedFields as string[] | undefined) ?? []
    if (mappedFields.length === 0) continue
    const hasPriorFb = fbPositions.some(p => p < step.position)
    if (!hasPriorFb) {
      return "This step references fields that won't exist at runtime — no upstream Facebook step found"
    }
  }
  return null
}

export const scenariosRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({ includeQuickSetup: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const scenarios = await db.scenario.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.includeQuickSetup === false ? { kind: { not: ScenarioKind.QUICK_SETUP } } : {}),
        },
        include: { steps: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      })
      return scenarios.map(scenarioToFrontend)
    }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const s = await db.scenario.findFirstOrThrow({
        where: { id: input.id, userId: ctx.userId },
        include: { steps: { orderBy: { position: 'asc' } } },
      })
      return scenarioToFrontend(s)
    }),

  create: authedProcedure
    .input(z.object({
      name: z.string().min(1).max(120),
      enabled: z.boolean().default(false),
      steps: z.array(ScenarioStepInput).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const scenario = await db.scenario.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          kind: ScenarioKind.CUSTOM,
          enabled: input.enabled,
          steps: {
            create: input.steps.map(s => ({
              position: s.position,
              moduleType: s.moduleType,
              config: s.config,
            })),
          },
        },
        include: { steps: { orderBy: { position: 'asc' } } },
      })
      const validationWarning = validateFieldMappings(scenario.steps.map(st => ({
        position: st.position, moduleType: st.moduleType, config: st.config as Record<string, unknown>,
      })))
      return { scenario: scenarioToFrontend(scenario), validationWarning }
    }),

  update: authedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        name: z.string().min(1).max(120).optional(),
        enabled: z.boolean().optional(),
        steps: z.array(ScenarioStepInput).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      await db.scenario.findFirstOrThrow({ where: { id: input.id, userId: ctx.userId } })

      const scenario = await db.scenario.update({
        where: { id: input.id },
        data: {
          name: input.data.name,
          enabled: input.data.enabled,
          ...(input.data.steps ? {
            steps: {
              deleteMany: {},
              create: input.data.steps.map(s => ({
                position: s.position,
                moduleType: s.moduleType,
                config: s.config,
              })),
            },
          } : {}),
        },
        include: { steps: { orderBy: { position: 'asc' } } },
      })
      const validationWarning = validateFieldMappings(scenario.steps.map(st => ({
        position: st.position, moduleType: st.moduleType, config: st.config as Record<string, unknown>,
      })))
      return { scenario: scenarioToFrontend(scenario), validationWarning }
    }),

  toggleEnabled: authedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.scenario.findFirstOrThrow({ where: { id: input.id, userId: ctx.userId } })
      await db.scenario.update({ where: { id: input.id }, data: { enabled: input.enabled } })
      return { id: input.id, enabled: input.enabled }
    }),

  runNow: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.scenario.findFirstOrThrow({ where: { id: input.id, userId: ctx.userId } })
      // Fire and return runId immediately; execution is async
      const runId = await executeRun(input.id, 'MANUAL', ctx.userId)
      return { runId }
    }),

  testRun: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.scenario.findFirstOrThrow({ where: { id: input.id, userId: ctx.userId } })
      const runId = await executeRun(input.id, 'MANUAL', ctx.userId)
      const logs = await db.runLog.findMany({ where: { runId }, orderBy: { ts: 'asc' } })
      const run = await db.run.findUniqueOrThrow({ where: { id: runId }, include: { scenario: { include: { steps: true } } } })
      return run.scenario.steps.map(step => {
        const stepLogs = logs.filter(l => l.message.includes(`Step ${step.position}`))
        const completedLog = stepLogs.find(l => l.message.includes('completed'))
        const meta = completedLog?.meta as { durationMs?: number; rowCount?: number } | null
        return {
          stepId: step.id,
          status: run.status === 'FAILED' && !completedLog ? 'failed' as const : 'success' as const,
          durationMs: meta?.durationMs ?? 0,
          output: { rowCount: meta?.rowCount ?? 0 },
        }
      })
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.scenario.findFirstOrThrow({ where: { id: input.id, userId: ctx.userId } })
      await db.scenario.delete({ where: { id: input.id } })
      return { success: true as const, id: input.id }
    }),

  duplicate: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await db.scenario.findFirstOrThrow({
        where: { id: input.id, userId: ctx.userId },
        include: { steps: { orderBy: { position: 'asc' } } },
      })
      const copy = await db.scenario.create({
        data: {
          userId: ctx.userId,
          name: `${source.name} (copy)`,
          kind: source.kind,
          enabled: false,
          steps: {
            create: source.steps.map(s => ({
              position: s.position,
              moduleType: s.moduleType,
              config: s.config,
            })),
          },
        },
        include: { steps: { orderBy: { position: 'asc' } } },
      })
      return scenarioToFrontend(copy)
    }),
})
```

**`src/server/api/routers/runs.ts`** — real DB with same filter/pagination contract:

```typescript
import { z } from 'zod'
import { db } from '~/server/db'
import { RunStatus, RunTrigger } from '@prisma/client'
import { authedProcedure, createTRPCRouter } from '~/server/api/trpc'

function normalizeStatus(s: RunStatus): 'queued' | 'running' | 'success' | 'failed' {
  return s.toLowerCase() as 'queued' | 'running' | 'success' | 'failed'
}
function normalizeTrigger(t: RunTrigger): 'manual' | 'scheduled' {
  return t.toLowerCase() as 'manual' | 'scheduled'
}

const StatusSchema = z.enum(['queued', 'running', 'success', 'failed'])

export const runsRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({
      accountIds: z.array(z.string()).optional(),
      statuses: z.array(StatusSchema).optional(),
      scenarioIds: z.array(z.string()).optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(10),
    }).optional())
    .query(async ({ ctx, input }) => {
      const opts = input ?? { page: 1, pageSize: 10 }
      const where = {
        userId: ctx.userId,
        ...(opts.statuses?.length ? { status: { in: opts.statuses.map(s => s.toUpperCase() as RunStatus) } } : {}),
        ...(opts.scenarioIds?.length ? { scenarioId: { in: opts.scenarioIds } } : {}),
      }
      const [runs, total] = await db.$transaction([
        db.run.findMany({
          where, include: { scenario: { select: { name: true, kind: true } } },
          orderBy: { startedAt: 'desc' },
          skip: ((opts.page ?? 1) - 1) * (opts.pageSize ?? 10),
          take: opts.pageSize ?? 10,
        }),
        db.run.count({ where }),
      ])
      const pageSize = opts.pageSize ?? 10
      return {
        runs: runs.map(r => ({
          id: r.id, userId: r.userId, scenarioId: r.scenarioId,
          adAccountId: '',   // no longer used directly — kept for type compat
          trigger: normalizeTrigger(r.trigger),
          status: normalizeStatus(r.status),
          startedAt: r.startedAt, finishedAt: r.finishedAt,
          campaignRowsWritten: r.campaignRowsWritten,
          adRowsWritten: r.adRowsWritten,
          durationMs: r.durationMs,
          errorMessage: r.errorMessage, sheetsUrl: r.sheetsUrl,
        })),
        total,
        page: opts.page ?? 1,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      }
    }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await db.run.findFirstOrThrow({ where: { id: input.id, userId: ctx.userId } })
      return {
        id: r.id, userId: r.userId, scenarioId: r.scenarioId, adAccountId: '',
        trigger: normalizeTrigger(r.trigger), status: normalizeStatus(r.status),
        startedAt: r.startedAt, finishedAt: r.finishedAt,
        campaignRowsWritten: r.campaignRowsWritten, adRowsWritten: r.adRowsWritten,
        durationMs: r.durationMs, errorMessage: r.errorMessage, sheetsUrl: r.sheetsUrl,
      }
    }),
})
```

**`src/server/api/routers/runLogs.ts`** — real DB:

```typescript
import { z } from 'zod'
import { db } from '~/server/db'
import { authedProcedure, createTRPCRouter } from '~/server/api/trpc'

export const runLogsRouter = createTRPCRouter({
  byRunId: authedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the run belongs to the user
      await db.run.findFirstOrThrow({ where: { id: input.runId, userId: ctx.userId } })
      const logs = await db.runLog.findMany({
        where: { runId: input.runId },
        orderBy: { ts: 'asc' },
      })
      return logs.map(l => ({
        id: l.id, runId: l.runId,
        level: l.level as 'INFO' | 'WARN' | 'ERROR',
        message: l.message,
        meta: l.meta as Record<string, unknown> | null,
        timestamp: l.ts,
      }))
    }),
})
```

**`src/server/api/routers/adAccounts.ts`** — real DB:

Read the existing `adAccounts.ts` router for the current mock procedures. Replace all of them with real DB equivalents using `authedProcedure` and `db.*`. The `runNow` mutation on an AdAccount creates a Run for the AdAccount's associated QUICK_SETUP scenario (look it up by `adAccountId`). If no such scenario exists, create a transient run directly.

The return types must be backwards-compatible with the mock types in `src/server/mocks/types.ts`. Normalize `levels` (Prisma `AdLevel[]`) back to `("CAMPAIGN" | "AD")[]`, normalize `lastRunStatus`.

**`worker/index.ts`** — the cron worker:

```typescript
import 'dotenv/config'
import { schedule } from 'node-cron'
import { db } from '~/server/db'
import { executeRun } from '~/server/core/executor'
import { parseCron, nextFireAt } from '~/lib/cron-builder'

const TICK_INTERVAL = process.env.WORKER_TICK_INTERVAL_MS
  ? parseInt(process.env.WORKER_TICK_INTERVAL_MS, 10)
  : 60_000

async function tick(): Promise<void> {
  const now = new Date()

  const enabled = await db.scenario.findMany({
    where: { enabled: true },
    include: { steps: { orderBy: { position: 'asc' } } },
  })

  for (const scenario of enabled) {
    const trigger = scenario.steps.find(s => s.position === 1)
    if (!trigger || trigger.moduleType !== 'trigger.schedule') continue

    const config = trigger.config as { cronExpression?: string }
    const expr = config.cronExpression
    if (!expr) continue

    const parsed = parseCron(expr)
    if (!parsed) continue

    const next = nextFireAt(parsed, scenario.lastRunAt ?? new Date(0))
    if (next && next <= now) {
      console.log(`[worker] Firing scenario ${scenario.id} (${scenario.name})`)
      executeRun(scenario.id, 'SCHEDULED', scenario.userId).catch(err => {
        console.error(`[worker] Scenario ${scenario.id} failed:`, err)
      })
    }
  }
}

console.log('[worker] Starting. Tick interval:', TICK_INTERVAL, 'ms')
schedule('* * * * *', () => {
  tick().catch(console.error)
})
```

**`tests/executor.test.ts`** — unit tests using Vitest:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RunContext } from '~/server/core/run-context'
import { getHandler } from '~/server/core/module-handlers'

// Mock integrations so tests don't require real OAuth
vi.mock('~/integrations/facebook/graph-client', () => ({
  getAccountInsights: vi.fn().mockResolvedValue([{ date_start: '2024-01-01', spend: '100' }]),
  getCampaignInsights: vi.fn().mockResolvedValue([{ date_start: '2024-01-01', campaign_id: 'c1', spend: '50' }]),
  getAdInsights: vi.fn().mockResolvedValue([]),
  listAdAccounts: vi.fn().mockResolvedValue([]),
}))

vi.mock('~/integrations/google/sheets-client', () => ({
  appendRows: vi.fn().mockResolvedValue(3),
  upsertRows: vi.fn().mockResolvedValue(3),
}))

describe('RunContext', () => {
  it('getUpstreamRows returns rows from the most recent upstream position', () => {
    const ctx = new RunContext()
    ctx.setOutput(2, [{ a: 1 }])
    ctx.setOutput(3, [])
    expect(ctx.getUpstreamRows(4)).toEqual([{ a: 1 }])
  })

  it('getUpstreamRows returns [] when no upstream data', () => {
    const ctx = new RunContext()
    expect(ctx.getUpstreamRows(2)).toEqual([])
  })
})

describe('module handlers', () => {
  const mockStep = (moduleType: string, config: Record<string, unknown> = {}) => ({
    id: 'step_1',
    scenarioId: 'scn_1',
    position: 2,
    moduleType,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  it('trigger.manual is a no-op and returns {}', async () => {
    const handler = getHandler('trigger.manual')
    const ctx = new RunContext()
    const result = await handler({ step: mockStep('trigger.manual'), context: ctx, userId: 'u1', runId: 'r1' })
    expect(result).toEqual({})
  })

  it('fb.campaign_insights stores rows in context', async () => {
    const handler = getHandler('fb.campaign_insights')
    const ctx = new RunContext()
    await handler({
      step: mockStep('fb.campaign_insights', { fbAccountId: 'act_1', dateWindowDays: 7, metrics: ['spend'] }),
      context: ctx,
      userId: 'u1',
      runId: 'r1',
    })
    expect(ctx.getOutput(2).length).toBeGreaterThan(0)
  })

  it('sheets.append with missing upstream mapping writes empty cells without throwing', async () => {
    const handler = getHandler('sheets.append')
    const ctx = new RunContext()
    // No upstream output set — getUpstreamRows will return []
    const result = await handler({
      step: mockStep('sheets.append', { spreadsheetId: 'sheet_1', tabName: 'Campaigns', mappedFields: ['spend'] }),
      context: ctx,
      userId: 'u1',
      runId: 'r1',
    })
    expect(result.rowCount).toBe(0)  // appendRows called with [] → returns 0
  })

  it('reordered steps: sheets at pos 2 before fb at pos 3 writes empty cells', async () => {
    const ctx = new RunContext()
    // Simulate: step 3 (fb) hasn't run yet, step 2 (sheets) runs first
    const sheetsHandler = getHandler('sheets.append')
    const result = await sheetsHandler({
      step: { ...mockStep('sheets.append', { spreadsheetId: 'sheet_1', tabName: 'Tab', mappedFields: ['spend'] }), position: 2 },
      context: ctx,
      userId: 'u1',
      runId: 'r1',
    })
    expect(result.rowCount).toBe(0)
  })
})
```

**`pnpm test` config — add to `package.json`:**

Vitest needs a config. Add `vitest.config.ts` at the repo root:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
})
```

**Acceptance criteria for Agent D:**
- [ ] `scenariosRouter.runNow(id)` creates a real Run row and returns `{ runId }` immediately
- [ ] After `runNow`, the Run row in DB transitions from RUNNING → SUCCESS or FAILED
- [ ] `/runs/[id]` shows real log entries with step timestamps
- [ ] `pnpm worker` starts without errors and logs "Starting. Tick interval: 60000 ms"
- [ ] A scenario with `trigger.schedule` cron `* * * * *` fires a SCHEDULED run within 90 seconds of being enabled
- [ ] Disabling a scenario (`enabled: false`) prevents the worker from firing it
- [ ] All 4 unit tests in `tests/executor.test.ts` pass (`pnpm test`)
- [ ] `pnpm typecheck` exits 0 in this worktree

---

## Stage 2' — Integration + Verify (~1.5 hr)

### 2'.1 — Merge order (deterministic, no shortcuts)

The orchestrator merges branches in this exact order. Each merge must be followed by `pnpm typecheck` before the next merge.

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
Set-Location $root
git checkout phase-2

# Step 1: Merge NextAuth first — everything depends on real auth
git merge phase2/nextauth --no-ff -m "merge phase2/nextauth"
pnpm typecheck   # must pass before continuing

# Step 2: Merge Google Sheets integration
git merge phase2/google-sheets-integration --no-ff -m "merge phase2/google-sheets-integration"
pnpm typecheck

# Step 3: Merge Facebook integration
# connections.ts: Agent C's merge must come AFTER Agent B's.
# Agent C's branch should already contain the updated connections.ts with Facebook stubs filled in.
# If there is a conflict on connections.ts, use Agent C's version (it includes Agent B's Google code).
git merge phase2/facebook-integration --no-ff -m "merge phase2/facebook-integration"
pnpm typecheck

# Step 4: Merge executor + worker
git merge phase2/executor-and-worker --no-ff -m "merge phase2/executor-and-worker"
pnpm typecheck
```

If any merge produces a conflict:
- On router files (except `connections.ts`): each agent owned its own file exclusively, so conflicts indicate a branch management mistake — resolve by taking the newer branch's version entirely.
- On `connections.ts`: take Agent C's version (it is a superset of Agent B's).
- On `src/server/api/trpc.ts`: Agent A added `authedProcedure`. If Agent D also modified it, reconcile by ensuring both `authedProcedure` and the timing middleware are present.

### 2'.2 — Full quality gate

```powershell
pnpm typecheck   # exits 0
pnpm lint        # exits 0
pnpm test        # 4 tests pass
```

### 2'.3 — Manual e2e walkthrough

Run this script with `pnpm dev` and `pnpm worker` both running. You need:
- A Google Sheet (copy the Sheet ID from its URL)
- A Facebook test user with a test ad account (from SETUP.md section 1)
- `.env` fully populated

**Step 1 — Login**
1. Open http://localhost:3000 in an incognito window.
2. Confirm redirect to `/login`.
3. Click "Sign in with Google".
4. Complete Google consent as `jumanovsamandar005@gmail.com`.
5. Confirm you land at `/connections`.

**Step 2 — Connect Google Sheets**
1. On `/connections`, find the Google Sheets card (status: Disconnected).
2. Click "Connect".
3. Complete Google consent screen — select your account, allow Sheets scope.
4. Confirm the card shows "Connected".
5. Open `pnpm db:studio` → `OAuthConnection` table → verify `accessToken` is ciphertext (starts with base64url chars, contains two `:` separators), NOT a plaintext Google token.

**Step 3 — Connect Facebook**
1. On `/connections`, find the Facebook card.
2. Click "Connect".
3. In the Facebook consent screen, log in as your test user.
4. Authorize the app (ads_read, read_insights permissions).
5. Confirm the Facebook card shows "Connected".
6. Verify the `OAuthConnection` row for Facebook in DB Studio has encrypted `accessToken`.

**Step 4 — Create and run a scenario**
1. Navigate to `/scenarios/new`.
2. Pick the "Daily campaign metrics → Sheet" template.
3. Step 1 (Schedule trigger): set `* * * * *` (fires every minute — for testing only).
4. Step 2 (FB Campaign Insights): select your test ad account from the dropdown. Date window: 7 days. Pick at least 3 metrics (e.g., impressions, spend, clicks).
5. Step 3 (Sheets Upsert): paste your Google Sheet ID. Tab name: `Phase2Test`. Key fields: `date_start,campaign_id`.
6. Click Save. Verify no error toast.
7. Click "Run now".
8. Wait ~15 seconds. Navigate to `/runs`.
9. Confirm a new Run row appears with status SUCCESS (green).
10. Click the run to open `/runs/[id]`. Verify:
    - Duration is shown in milliseconds
    - Log entries are visible (Step 1 starting, Step 1 completed, Step 2 starting, etc.)
    - campaignRowsWritten > 0 (or 0 if the test account has no historical data — that is OK)
11. Open your Google Sheet in the browser. Verify the `Phase2Test` tab was created and has rows.

**Step 5 — Scheduled run**
1. Enable the scenario (click the Enable toggle on `/scenarios/[id]`).
2. In a separate terminal, run `pnpm worker`.
3. Wait up to 90 seconds.
4. Refresh `/runs`. A new SCHEDULED run should appear.
5. Disable the scenario.
6. Wait 2 minutes.
7. Confirm no new SCHEDULED runs were created after disabling.

**Step 6 — Failure case**
1. Duplicate the scenario.
2. Edit the duplicate: change the Google Sheet ID to a non-existent one (`INVALID_SHEET_ID`).
3. Click "Run now".
4. Wait ~15 seconds. Confirm the run shows status FAILED.
5. Open the run — verify `errorMessage` contains a meaningful error from the Sheets API.

If any step fails, **surface the error verbatim** and stop. Do NOT auto-retry, do NOT delete data.

### 2'.4 — Tag

```powershell
git tag phase-2-done
```

---

## Global Acceptance Checklist (gate before tagging phase-2-done)

**End-to-end functional:**
- [ ] User logs in via real Google OAuth
- [ ] User connects real Google Sheets via OAuth → token stored encrypted
- [ ] User connects real Facebook via OAuth (test user) → long-lived token stored encrypted
- [ ] User creates a scenario, picks real FB ad account, real Sheet ID
- [ ] "Run now" actually fetches FB Insights and writes to the actual Google Sheet
- [ ] Worker fires scheduled runs unattended
- [ ] Run history shows real durations, row counts, error messages
- [ ] Disconnecting a connection sets `status = DISCONNECTED` in DB
- [ ] Disabling a scenario prevents worker from firing it

**Quality:**
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 (4 tests)
- [ ] Zero references to `getMockSession` in non-mock files (`Select-String -Path "src\**\*" -Pattern "getMockSession" -Recurse` returns nothing outside `src/server/mocks/`)
- [ ] All `*Router` procedures backed by real DB (verifiable: interact with UI → rows change in `pnpm db:studio`)
- [ ] Tokens in DB are encrypted (base64url-encoded ciphertext, NOT plaintext OAuth tokens)
- [ ] Allowlist enforced: non-allowlisted Google account rejected at signIn

**Manual setup:**
- [ ] `docs/SETUP.md` followed end-to-end on a fresh laptop
- [ ] `.env` has all 11 required vars filled in (no angle-bracket placeholders)
- [ ] Docker Postgres running on port 5432 (`docker ps | grep automation-postgres`)
- [ ] `pnpm db:seed:mock` runs without errors and seeds the dev dataset

---

## Explicit "Do NOT" List

- Do NOT deploy anywhere (no Railway, no Vercel, no Docker for the app — only Docker for Postgres)
- Do NOT push to a remote (`git push` is not configured in this repo — do not configure it)
- Do NOT add unrequested features (no rate limiting, no admin panel, no email notifications, no webhook triggers)
- Do NOT introduce additional auth mechanisms (no email/password, no magic link, no passwordless)
- Do NOT add tests beyond `tests/executor.test.ts` (no Playwright, no integration tests hitting real APIs)
- Do NOT skip token encryption — every token in DB must be encrypted at rest, always
- Do NOT log decrypted token values — treat tokens as passwords
- Do NOT use `any` type or `// @ts-ignore` without a one-line reason comment
- Do NOT introduce a job queue (no BullMQ, no Redis, no pg-boss) — `node-cron` is sufficient
- Do NOT modify `src/components/`, `src/app/(dashboard)/`, or `src/styles/`
- Do NOT delete or recreate `node_modules` (it's inside OneDrive — use the existing junction)

---

## Each Subagent's Final Report

At the end of each agent's work, before committing, produce a report with:

1. **Files written** — absolute paths
2. **tRPC procedures replaced** — list each one: `connections.list: mock → real DB`
3. **Items skipped and why** — be explicit. "I did not implement X because Y."
4. **Typecheck result** — `pnpm typecheck` exit code in this worktree
5. **Test result** (Agent D only) — `pnpm test` exit code
6. **Manual verification** — confirm the specific OAuth flow, DB write, or API call that proves this agent's lane works end-to-end. Example: "I connected Google Sheets, saw the encrypted accessToken in DB Studio, then confirmed appendRows wrote 3 rows to my test Sheet at ID 1BxiMV…"
