# Phase 2 — Manual Setup Guide

> **Run this between the Stage 0' commit and the `manual setup done` reply.**
> Estimated total time: ~45 minutes.
> Do NOT paste `manual setup done` until every checklist item below is ticked.

---

## Prerequisites

Before starting, confirm:

- [ ] Docker Desktop is installed and running (https://docker.com/products/docker-desktop)
- [ ] Node 22.14 is active (`node --version` → `v22.14.x`)
- [ ] pnpm 9.15.9 is installed (`pnpm --version` → `9.15.9`)
- [ ] Stage 0' commit is at HEAD of the `phase-2` branch (`git log --oneline -1` shows the Stage 0' message)
- [ ] `.env.example` exists in the repo root

---

## 1. Facebook Developer App (~20 min)

### 1.1 Create the app

1. Go to https://developers.facebook.com and log in with your personal Facebook account (your developer account — NOT the test user you will create later).
2. Click **My Apps** (top-right) → **Create App**.
3. Select use case: **Other** → click Next.
4. App type: **Business** → click Next.
5. App name: `Automation Dashboard (Dev)` · Contact email: `jumanovsamandar005@gmail.com` → click **Create App**.

### 1.2 Add Marketing API

1. From your app dashboard, click **Add Product** (left sidebar).
2. Find **Marketing API** → click **Set Up**.
3. No additional configuration is needed at this step.

### 1.3 Copy credentials

1. Left sidebar → **Settings** → **Basic**.
2. Copy the **App ID** field.
3. Click **Show** next to **App Secret** → copy it.
4. Paste both into your `.env` file (create it now if it does not exist: `Copy-Item .env.example .env`):
   ```
   FACEBOOK_APP_ID=<your App ID>
   FACEBOOK_APP_SECRET=<your App Secret>
   ```
5. Still on Settings → Basic:
   - **App Domains** field: type `localhost` → click **Save Changes**.
   - Scroll down to the **Website** section (add one if not present: **Add Platform** → Web). Set Site URL: `http://localhost:3000` → **Save Changes**.

### 1.4 Add Facebook Login for Business (needed for OAuth redirect URI)

1. Click **Add Product** → find **Facebook Login for Business** → **Set Up**.
2. Left sidebar → **Facebook Login for Business** → **Settings**.
3. Under **Valid OAuth Redirect URIs**, add:
   ```
   http://localhost:3000/api/oauth/facebook/callback
   ```
4. Click **Save Changes**.

### 1.5 Create a test user

> Development Mode apps can only call the Marketing API on behalf of app-role users (admins, developers, testers). A test user is the cleanest approach for Phase 2.

1. Left sidebar → **Roles** → **Test Users**.
2. Click **Add** → create 1 test user. Note the generated username shown.
3. Click **Edit** next to the test user → set a password you can remember → **Save**.
4. Click **Edit** → **Add app** → select your `Automation Dashboard (Dev)` app → confirm → **Save**. The test user now has access to the app.

### 1.6 Create a test ad account with a paused campaign

> The FB Insights API returns empty data for accounts with zero historical activity. You must create at least one campaign (even if paused immediately) to get any Insights rows back during testing.

1. Open an **incognito / private browser window**.
2. Go to https://www.facebook.com — log in as your test user (use the credentials from Step 1.5).
3. Navigate to https://business.facebook.com.
4. Create a Business if prompted (name it anything — "Test Business Dev").
5. Inside the Business: **Accounts** → **Ad Accounts** → **Add** → **Create a new ad account**.
6. Name: `Test Ad Account`. Currency: USD. Time zone: `Asia/Tashkent` (or your local timezone).
7. Inside the new ad account, create a campaign:
   - Objective: **Awareness** (simplest, no pixel required)
   - Any ad set + ad name — the content does not matter
   - Budget: $1/day
   - **Immediately pause the campaign** after creation (click the campaign toggle to Paused)
8. From the ad account URL, copy the **account ID** — it appears as `act_XXXXXXXXX` in the URL bar or in Business Manager. Save it somewhere; you will paste it into a scenario step config during the Stage 2' e2e test.

### 1.7 Verify the setup with Graph API Explorer

1. Back in your **main browser** (developer account), go to your app dashboard.
2. Left sidebar → **Tools** → **Graph API Explorer**.
3. In the top-right dropdown, select your `Automation Dashboard (Dev)` app.
4. Under **User or Page Access Tokens**, click **Generate User Access Token** → check `ads_read` + `read_insights` → **Generate Token**.
5. In the query field, type: `me/adaccounts` → click **Submit**.
6. You should see your test ad account in the JSON response (`data` array with one entry).
7. If `data: []`, wait 30 seconds and retry — new accounts can take a moment.

> **No App Review needed for Phase 2.** Development Mode gives your test user full Marketing API access. App Review is only required when calling the API on behalf of users outside your app roles (Phase 3 concern).

**Checklist for Section 1:**
- [ ] App created in Business type
- [ ] Marketing API product added
- [ ] `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in `.env`
- [ ] App Domains has `localhost`; Website URL is `http://localhost:3000`
- [ ] OAuth redirect URI `http://localhost:3000/api/oauth/facebook/callback` added
- [ ] Test user created, granted access to app, password set
- [ ] Test ad account created with at least one paused campaign
- [ ] Graph API Explorer confirms `me/adaccounts` returns the test account

---

## 2. Google Cloud Project — Two OAuth Clients (~15 min)

> You need **two separate OAuth Client IDs** in the same project:
> - **Client 1** is for login (NextAuth Google provider). Gets `email + profile + openid` only.
> - **Client 2** is for Sheets data access (the custom OAuth flow). Gets the `spreadsheets` scope.
>
> Keeping them separate means your login session never carries Sheets write permission, and the Sheets connection can be revoked independently of login. This is the standard split (Firebase, Zapier, and Make.com all do it this way).

### 2.1 Create the project

1. Go to https://console.cloud.google.com.
2. Click the project dropdown (top-left, next to "Google Cloud") → **New Project**.
3. Project name: `automation-dev` → **Create**.
4. Make sure `automation-dev` is selected in the project dropdown before continuing.

### 2.2 Enable the Google Sheets API

1. Left sidebar → **APIs & Services** → **Library**.
2. Search `Google Sheets API` → click the result → **Enable**.

### 2.3 Configure the OAuth consent screen

1. Left sidebar → **APIs & Services** → **OAuth consent screen**.
2. User Type: **External** → **Create**.
3. Fill in required fields:
   - App name: `Automation Dashboard (Dev)`
   - User support email: `jumanovsamandar005@gmail.com`
   - Developer contact information: `jumanovsamandar005@gmail.com`
4. Click **Save and Continue**.
5. **Scopes** page → **Add or Remove Scopes** → add these four:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/spreadsheets`
   
   Click **Update** → **Save and Continue**.
6. **Test users** page → **Add Users** → add `jumanovsamandar005@gmail.com` → **Save and Continue**.
7. Review page → **Back to Dashboard**.

> The app is in Testing mode. Only the test users you listed above can authorize it. You do NOT need to publish or submit for verification for Phase 2.

### 2.4 Create OAuth Client 1 — Login (NextAuth)

1. Left sidebar → **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth 2.0 Client ID**.
3. Application type: **Web application**.
4. Name: `Automation NextAuth (Login)`.
5. Under **Authorized redirect URIs** → **Add URI**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **Create**.
7. A dialog shows Client ID and Client Secret. Copy both.
8. Paste into `.env`:
   ```
   GOOGLE_CLIENT_ID=<your Client ID>
   GOOGLE_CLIENT_SECRET=<your Client Secret>
   ```

### 2.5 Create OAuth Client 2 — Sheets Data Access

1. Still on the **Credentials** page → **Create Credentials** → **OAuth 2.0 Client ID**.
2. Application type: **Web application**.
3. Name: `Automation Sheets (Data)`.
4. Under **Authorized redirect URIs** → **Add URI**:
   ```
   http://localhost:3000/api/oauth/google/callback
   ```
5. Click **Create**.
6. Copy Client ID and Client Secret.
7. Paste into `.env`:
   ```
   GOOGLE_OAUTH_SHEETS_CLIENT_ID=<your Client ID>
   GOOGLE_OAUTH_SHEETS_CLIENT_SECRET=<your Client Secret>
   ```

**Checklist for Section 2:**
- [ ] Project `automation-dev` created and selected
- [ ] Google Sheets API enabled
- [ ] OAuth consent screen configured with `spreadsheets` scope, test user added
- [ ] Client 1 (Login) created, redirect URI `http://localhost:3000/api/auth/callback/google`, credentials in `.env`
- [ ] Client 2 (Sheets) created, redirect URI `http://localhost:3000/api/oauth/google/callback`, credentials in `.env`

---

## 3. Target Google Sheet (~2 min)

1. Open https://sheets.google.com in your browser (logged in as `jumanovsamandar005@gmail.com`).
2. Click **Blank** to create a new spreadsheet.
3. Name it: `Automation Test Tracker`.
4. Look at the URL — it looks like:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
   ```
5. Copy the long string between `/d/` and `/edit`. That is your **Spreadsheet ID**.
   - Correct: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`
   - Wrong: includes `/d/` or `/edit` or any slashes
6. Save the Spreadsheet ID somewhere — you will paste it into a scenario step config during the Stage 2' e2e test.

**Checklist for Section 3:**
- [ ] Sheet created at https://sheets.google.com
- [ ] Spreadsheet ID copied (long string, no slashes)

---

## 4. Fill In `.env` (~5 min)

```powershell
# From the repo root:
Copy-Item .env.example .env
# Then open .env in your editor and fill in every value.
# (If .env already exists, just edit it — do not lose values you already have.)
```

**Generate `TOKEN_ENC_KEY`** (64 hex chars = 32 bytes, required for AES-256-GCM):

```powershell
# Windows PowerShell — no openssl required:
[System.BitConverter]::ToString(
  [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
) -replace '-',''
# Copy the output (64 uppercase hex characters) and paste as TOKEN_ENC_KEY
```

**Generate `NEXTAUTH_SECRET`** (base64, 32 random bytes):

```powershell
[System.Convert]::ToBase64String(
  [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)
# Copy the output and paste as NEXTAUTH_SECRET
```

If you have OpenSSL available (WSL or Git Bash):
```bash
openssl rand -hex 32        # for TOKEN_ENC_KEY
openssl rand -base64 32     # for NEXTAUTH_SECRET
```

**Complete `.env` after filling in all values:**

```dotenv
DATABASE_URL=postgresql://automation:automation@localhost:5434/automation
NEXTAUTH_SECRET=<generated above>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from step 2.4>
GOOGLE_CLIENT_SECRET=<from step 2.4>
GOOGLE_OAUTH_SHEETS_CLIENT_ID=<from step 2.5>
GOOGLE_OAUTH_SHEETS_CLIENT_SECRET=<from step 2.5>
FACEBOOK_APP_ID=<from step 1.3>
FACEBOOK_APP_SECRET=<from step 1.3>
TOKEN_ENC_KEY=<generated above — 64 hex chars>
ALLOWLIST_EMAIL=jumanovsamandar005@gmail.com
FB_GRAPH_API_VERSION=v22.0
```

> **Security note:** `TOKEN_ENC_KEY` is the encryption key for all OAuth tokens stored in the database. Treat it like a password. Never commit `.env` to git. Never share this value.

**Checklist for Section 4:**
- [ ] `.env` exists at repo root (not `.env.example`)
- [ ] `DATABASE_URL` points to `localhost:5434/automation` (compose.yml maps host 5434 to container 5432 because this machine has native Postgres on 5432 and 5433)
- [ ] `NEXTAUTH_SECRET` is a base64 string (~44 chars)
- [ ] `NEXTAUTH_URL` is `http://localhost:3000`
- [ ] Both `GOOGLE_CLIENT_ID` and `GOOGLE_OAUTH_SHEETS_CLIENT_ID` are filled in (they are different values)
- [ ] `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` are filled in
- [ ] `TOKEN_ENC_KEY` is exactly 64 hex characters (no dashes, all lowercase or uppercase)
- [ ] `ALLOWLIST_EMAIL` is `jumanovsamandar005@gmail.com`
- [ ] `FB_GRAPH_API_VERSION` is `v22.0`

---

## 5. Verify Everything Boots (~3 min)

Run these commands in order. Each must succeed before the next.

```powershell
# 1. Start Postgres
pnpm db:up
# Expected: "Container automation-postgres  Started" (first run downloads image)
# Verify: docker ps | Select-String "automation-postgres"

# 2. Apply the database schema
pnpm prisma migrate deploy
# Expected: "All migrations have been applied successfully."
# (Or "No pending migrations" if migrate dev already ran in Stage 0')

# 3. Seed demo data (optional but recommended for dev)
pnpm db:seed:mock
# Expected: "Seeded: 1 user, 3 ad accounts, 7 scenarios, 30 runs, logs"

# 4. Start the dev server
pnpm dev
# Expected: Ready on http://localhost:3000 (or :3002 — read the output)
```

### Quick smoke test

1. Open http://localhost:3000 in your browser.
2. You should be redirected to `/login`.
3. Click **Sign in with Google**.
4. Google consent screen should appear. Log in as `jumanovsamandar005@gmail.com`.
5. You should land on `/connections`.
6. The page should show two connection cards: Google Sheets (Disconnected) and Facebook (Disconnected).

> Note: At this point in Phase 2 (Stage 0' done, Stage 1' not yet dispatched), the login screen still uses the Phase 1.6 mock session. The real Google OAuth is wired in Stage 1' by the NextAuth-Agent. This smoke test is just confirming the dev server starts and the existing UI still renders — real login will be tested after Stage 1' merges.

If the smoke test passes (dev server starts, existing routes render, no TypeScript errors in the terminal), you are ready. Return to the Claude Code session and reply:

```
manual setup done
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `docker: command not found` or Docker Desktop not starting | Docker Desktop not installed or not running | Install from https://docker.com/products/docker-desktop. Restart PowerShell after install. On Windows, Docker Desktop must be running (check system tray). |
| `pnpm db:up` errors with `port already in use` | Another Postgres instance running on the configured host port | Run `netstat -ano | Select-String ":543"` to find the conflicting PID and port. Either stop the other service or change the host side of the port mapping in `compose.yml` (e.g., `"5435:5432"`) and update `DATABASE_URL` to match. This repo ships with `5434:5432` for that reason — adjust if 5434 is also in use on your machine. |
| `pnpm prisma migrate deploy` fails with connection refused | Postgres container is not yet ready | Wait 5 seconds after `pnpm db:up` and retry. The first run requires pulling the image. |
| `pnpm prisma migrate deploy` fails with "type already exists" | DB has stale enums from a previous partial migration | Run `pnpm db:reset` (destroys volume, recreates container) then retry from `pnpm db:up`. |
| `pnpm dev` fails with "Missing environment variable" | `.env` file missing or has angle-bracket placeholders | Open `.env`, confirm every value is filled in (no `<...>` markers remain). |
| Google consent screen shows "This app hasn't been verified" with a warning but still allows login | Normal for Testing mode with External user type | Click "Advanced" → "Go to Automation Dashboard (Dev) (unsafe)" — this is expected for development. No action needed. |
| Google login redirects back to `/login` with an error after Phase 1' merges | `NEXTAUTH_URL` mismatch or wrong redirect URI | Confirm `NEXTAUTH_URL=http://localhost:3000` in `.env`. Confirm `http://localhost:3000/api/auth/callback/google` is in OAuth Client 1's redirect URIs in Google Cloud Console. |
| Google login works but shows "Not allowlisted" or similar | Signed in with a non-allowlisted Google account | Sign out, sign in as `jumanovsamandar005@gmail.com`. |
| Facebook consent screen shows "App not available" or "App is not set up" | Test user was not added to app roles, or redirect URI is missing | Confirm Step 1.4 (redirect URI) and Step 1.5 ("Add app" for the test user). |
| `me/adaccounts` in Graph API Explorer returns `data: []` | Test ad account has no paused campaign yet | Complete Step 1.6 (create and immediately pause a campaign). Wait 1–2 min and retry. |
| `TOKEN_ENC_KEY` error at runtime: "must be a 64-character hex string" | Key generated with wrong length | Re-run the PowerShell generation command and count characters — must be exactly 64. Do NOT include dashes or spaces. |
| Spreadsheet ID was wrong format | Copied ID incorrectly | The ID is the segment between `/d/` and the next `/` in the Sheets URL. No slashes. Typical length is 44 characters. |
| `pnpm db:seed:mock` fails with `PrismaClientKnownRequestError` on upsert | Scenario step `@@unique([scenarioId, position])` constraint violated | Delete all existing data: `pnpm db:reset` then `pnpm db:up` then retry seed. |
