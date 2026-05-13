# Deployment guide (Railway)

This is a single-user personal dashboard. The stack is:

- **Web service** — Next.js 15 (App Router) on Node.js 20
- **Worker service** — `tsx worker/index.ts` ticking every minute (cron + Sheets/Bitrix polling)
- **Postgres** — Railway-managed add-on

Both services run from the same Git repo, just with different start commands.

---

## 0. Pre-flight (run locally once)

```powershell
pnpm install
pnpm prisma generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All five must pass. `pnpm build` is the same command Railway will run — if it fails locally it will fail in CI.

---

## 1. Create the Railway project

1. Sign in at https://railway.com and click **New Project** → **Empty Project**.
2. Name it `automation` (or whatever). You should land on the project canvas.

---

## 2. Provision Postgres

1. On the canvas, click **+ Create** → **Database** → **Add PostgreSQL**.
2. Once provisioned, click the Postgres tile → **Variables** → confirm `DATABASE_URL` exists.
3. **Do not** wire it manually anywhere — we'll reference it from the web/worker services using `${{Postgres.DATABASE_URL}}`.

---

## 3. Create the **web** service

1. **+ Create** → **GitHub Repo** → pick this repo → branch `main` (or `phase-3-ui` for now).
2. Open the new service → **Settings**:
   - **Root directory**: leave blank (project lives at repo root).
   - **Watch paths**: leave blank.
   - **Config file**: set to `railway.json` (Railway auto-detects this — verify it's selected).
3. Open **Variables** and add (paste, don't type):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(variable reference)* |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` — 32+ random bytes |
   | `NEXTAUTH_URL` | The public URL Railway will assign — **fill in after step 5** |
   | `GOOGLE_CLIENT_ID` | from Google Cloud → APIs → OAuth client (Web) |
   | `GOOGLE_CLIENT_SECRET` | same |
   | `TOKEN_ENC_KEY` | `openssl rand -hex 32` — exactly 64 hex chars |
   | `ALLOWLIST_EMAIL` | the single email that may sign in |
   | `GOOGLE_OAUTH_SHEETS_CLIENT_ID` | *(optional — only if connecting Sheets)* |
   | `GOOGLE_OAUTH_SHEETS_CLIENT_SECRET` | same |
   | `FACEBOOK_APP_ID` | *(optional — only if connecting FB Ads)* |
   | `FACEBOOK_APP_SECRET` | same |
   | `FB_GRAPH_API_VERSION` | `v22.0` |
   | `FACEBOOK_APP_REVIEW_PENDING` | `false` (or `true` while in app review) |
   | `WORKER_ENABLED` | `false` *(web service does not run the worker)* |

4. **Do NOT deploy yet** — we still need the public URL for `NEXTAUTH_URL`.

---

## 4. Create the **worker** service (same repo)

1. **+ Create** → **GitHub Repo** → pick the same repo.
2. Rename to `worker`.
3. **Settings**:
   - **Config file**: set to `railway.worker.json`.
   - The worker has **no public port** — under **Networking**, leave it private (no domain).
4. **Variables**: copy everything from the web service except:
   - `WORKER_ENABLED` → `true`
   - `WORKER_TICK_INTERVAL_MS` → `60000` (or however often you want it to tick)

---

## 5. Generate the public URL and finish wiring

1. Open the web service → **Settings** → **Networking** → **Generate Domain**.
2. Copy the URL Railway assigns (e.g. `automation-production-xxxx.up.railway.app`).
3. Web service → **Variables** → set `NEXTAUTH_URL` to `https://<that-domain>` (no trailing slash).
4. **Re-deploy** the web service so the new `NEXTAUTH_URL` takes effect.

---

## 6. Update OAuth callback URLs

After you have the public URL, go register the callbacks with each provider:

| Provider | Console | Callback URL |
|---|---|---|
| Google (login) | https://console.cloud.google.com → Credentials → your OAuth client → "Authorized redirect URIs" | `https://<domain>/api/auth/callback/google` |
| Google (Sheets) | same OAuth client (or a separate one) | `https://<domain>/api/oauth/google/callback` |
| Facebook | https://developers.facebook.com → your app → Facebook Login → Settings → "Valid OAuth Redirect URIs" | `https://<domain>/api/oauth/facebook/callback` |
| Bitrix24 | Phase 4 — n/a until real OAuth is wired | — |

---

## 7. First-run database setup

The web service's `startCommand` already runs `pnpm prisma migrate deploy` before `next start`, so on first boot the schema is created automatically.

If you need to seed mock data, SSH into the web service (Railway → service → "Connect" → "Shell") and run:

```bash
pnpm db:seed:mock
```

---

## 8. Going live

1. Hit the public URL.
2. Click "Sign in with Google" — only the `ALLOWLIST_EMAIL` will be accepted.
3. Connect Google Sheets and Facebook from `/connections`.
4. Create an ad-account configuration and scenario, hit "Run now", confirm a row lands in Sheets.

---

## Rollback

```bash
# In the Railway web UI:
Service → Deployments → pick the last green deploy → "Redeploy"
```

There's no DB rollback story — Prisma migrations are forward-only. If you need to revert a schema change, write a new migration that reverses it and ship that.

---

## Common gotchas

- **`PrismaClientInitializationError` on first boot** — `DATABASE_URL` env var is missing or wrong. Verify the variable reference `${{Postgres.DATABASE_URL}}` resolved (check the Variables tab — it should show the actual postgres URL).
- **`NEXTAUTH_URL` mismatch** — sign-in redirects to the wrong host. Make sure it matches the public domain Railway assigned, including `https://` and no trailing slash.
- **OAuth callback "redirect_uri_mismatch"** — the callback URL you registered with Google/FB doesn't match the deployed domain. Re-register with the production URL.
- **Worker never ticks** — `WORKER_ENABLED` is not `"true"` on the worker service. Check its variables.
- **Edge runtime warnings about `jose` (CompressionStream)** — non-blocking; next-auth's edge middleware uses it but never reaches that code path in our setup. Safe to ignore.

---

## Environment variable reference

Required at build/boot time (validated by `src/env.js` — the build will fail if any is missing or malformed):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT signing key (32+ bytes) |
| `NEXTAUTH_URL` | Public URL of the web service |
| `GOOGLE_CLIENT_ID` | Google OAuth client (login provider) |
| `GOOGLE_CLIENT_SECRET` | same |
| `TOKEN_ENC_KEY` | 64-hex AES-256 key — encrypts third-party tokens at rest |
| `ALLOWLIST_EMAIL` | Comma-separated emails permitted to sign in |

Optional (only needed for the corresponding feature):

| Variable | Feature |
|---|---|
| `GOOGLE_OAUTH_SHEETS_CLIENT_ID` / `_SECRET` | "Connect Google Sheets" on `/connections` |
| `FACEBOOK_APP_ID` / `_SECRET` | "Connect Facebook Ads" on `/connections` |
| `FB_GRAPH_API_VERSION` | Defaults to `v22.0` |
| `FACEBOOK_APP_REVIEW_PENDING` | Cosmetic banner while the FB app is in review |
| `WORKER_ENABLED` | Must be `"true"` on the worker service, `"false"` on web |
| `WORKER_TICK_INTERVAL_MS` | How often the worker ticks (default 60000) |
| `BITRIX24_WEBHOOK_URL` | Bitrix24 sync feature |
| `GOOGLE_SHEETS_ID` + `GOOGLE_SHEETS_TAB_*` | Sheets-to-Bitrix sync source |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_KEY` | Sheets API service account |
| `SHEETS_POLL_INTERVAL_MS` | Sheets polling cadence (default 10000) |
