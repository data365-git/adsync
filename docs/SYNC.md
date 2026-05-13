# Google Sheets → Bitrix24 CRM Sync

This document covers how to set up, configure, and operate the Sheets→Postgres→Bitrix24 sync pipeline.

---

## How it works

```
Google Sheet (source)
      │  polled every SHEETS_POLL_INTERVAL_MS (default 10 s)
      ▼
Postgres: Lead / Deal / Contact tables
      │  changed rows → SyncJob outbox
      ▼
Bitrix24 CRM  +  SyncLog (full audit trail)
```

The worker process (`pnpm worker`) runs all three steps in a single tick:

1. **Poll** — fetch rows from Google Sheets, diff against stored `raw` column, upsert Postgres
2. **Drain** — pull pending `SyncJob` rows, push to Bitrix24 via inbound webhook, mark done/failed
3. **Retry** — re-queue failed jobs that are past their exponential backoff window (max 5 attempts)

---

## Setup

### 1. Bitrix24 inbound webhook

1. In your Bitrix24 portal: **Developer** → **Other** → **Inbound webhooks** → **Add webhook**
2. Grant permissions: `crm` (read + write)
3. Copy the webhook URL. It looks like `https://yourco.bitrix24.com/rest/1/abc123xyz/`
4. Add to `.env`:
   ```
   BITRIX24_WEBHOOK_URL="https://yourco.bitrix24.com/rest/1/abc123xyz/"
   ```

### 2. Google Sheets

**Sheet structure (one spreadsheet, three tabs):**

| Tab name | Required columns | Optional columns |
|---|---|---|
| Leads | name, phone | email, status, source |
| Deals | title | contactid, stageid, amount, currency |
| Contacts | name | phone, email, source |

Column names are **case-insensitive** and **space-trimmed**. Header row must be row 1.

**Service account auth:**

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Sheets API** for your project
3. Create a service account: **IAM & Admin** → **Service Accounts** → **Create**
4. Create a JSON key: service account → **Keys** → **Add Key** → **JSON** → download
5. Share your spreadsheet with the service account email (Viewer role)
6. base64-encode the key file and add to `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL="sync@your-project.iam.gserviceaccount.com"
   GOOGLE_SERVICE_ACCOUNT_KEY="<base64 of the JSON key>"
   ```
   Encode on Windows PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes(".\service-account-key.json"))
   ```

### 3. Spreadsheet ID and tab names

From your Sheet URL: `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`

```env
GOOGLE_SHEETS_ID="1BxiMVs0_..."
GOOGLE_SHEETS_TAB_LEADS="Leads"
GOOGLE_SHEETS_TAB_DEALS="Deals"
GOOGLE_SHEETS_TAB_CONTACTS="Contacts"
```

---

## Running

```powershell
# Start Postgres
pnpm db:up

# Apply migrations (already done — only needed on a fresh clone)
pnpm db:migrate

# Start the web app
pnpm dev

# Start the worker (in a separate terminal)
WORKER_ENABLED=true pnpm worker
```

Or set `WORKER_ENABLED=true` in `.env` and just run `pnpm worker`.

---

## Field mappings

Edit `src/server/bitrix24/field-mappings.ts` to change which Prisma fields map to which Bitrix24 fields.

**Adding a custom field (UF_CRM_\*):**

1. Discover the exact field name for your portal:
   ```ts
   import { fetchEntitySchema } from "~/server/bitrix24/schema";
   const schema = await fetchEntitySchema("lead");
   console.log(Object.keys(schema).filter((k) => k.startsWith("UF_")));
   ```
2. Add a column in your Sheet with a matching header (e.g. `utm_source`)
3. Add an entry in `LEAD_MAPPING`:
   ```ts
   { prismaField: "utm_source", bitrixField: "UF_CRM_1234567890" }
   ```
   Note: `prismaField` here refers to a key in the `raw` JSON column — the header name from your Sheet, lowercased.

---

## Monitoring

Via tRPC from any UI component:

```ts
// Queue depth, last sync time, error rate
const status = trpc.sync.status.useQuery();

// Trigger a full re-sync of one entity
trpc.sync.triggerManual.mutate({ entity: "Lead" });

// Retry all failed jobs
trpc.sync.retryFailed.mutate();
```

Via Postgres directly:

```sql
-- Pending jobs
SELECT entity, count(*) FROM "SyncJob" WHERE status = 'pending' GROUP BY entity;

-- Recent errors
SELECT entity, error, "createdAt" FROM "SyncLog"
WHERE success = false ORDER BY "createdAt" DESC LIMIT 20;

-- Audit trail for a specific lead
SELECT * FROM "SyncLog" WHERE entity = 'Lead' ORDER BY "createdAt" DESC;
```

---

## Deduplication

Before every `crm.lead.add` or `crm.contact.add`, the worker calls `crm.duplicate.findbycomm` with the phone number. If an existing Bitrix record is found:
- The **update** method is called instead of add
- No duplicate is created in Bitrix24

**Deals** do not have built-in dedup — identity is tracked via `bitrixId` in Postgres. Once a Deal is synced, its `bitrixId` is stored and used for all future updates.

---

## Retry behavior

| Attempt | Wait before retry |
|---|---|
| 1 | 2 s |
| 2 | 4 s |
| 3 | 8 s |
| 4 | 16 s |
| 5 | 32 s (final) |

After 5 failed attempts, the job stays in `status = "failed"` and is not retried automatically. Call `sync.retryFailed` (tRPC) to reset them.

---

## Limits

- Bitrix24 rate limit: **2 requests/second** per webhook. Bulk pushes use the `batch` endpoint (50 ops/request) to stay within limits.
- If you have >50 pending jobs, they are processed in batches of 10 per tick (configurable via `BATCH_SIZE` in `orchestrator.ts`).
- Sheet polling does not delete rows from Bitrix24 when a row is removed from the Sheet. Deletion behavior must be explicitly configured if needed.
