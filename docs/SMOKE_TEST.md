# adsync - Phase A Smoke Test (locked 2026-05-14)

This is the canonical end-to-end test that proves the engine moves real data. It exercises every KEEP-IMPL module:

- `fb.list_ad_accounts` - load the user's ad accounts
- `sheets.find_rows` - find rows in a Google Sheet
- `sheets.update_row` - write a row back to that sheet
- `bitrix.create_lead` - create a lead in Bitrix24

(`bitrix.update_lead` is exercised by the rerun variant below.)

## Prerequisites

- A test Google Sheet you own, with at least these columns in a tab called `Leads`:
  `id | name | email | status`
  Populate row 2 with: `42 | Alice | alice@example.com | new`
- A test Bitrix24 portal with the incoming webhook URL set as `BITRIX24_WEBHOOK_URL` in `.env`
- Working Google + Facebook OAuth connections in `/connections`

Capture the spreadsheet ID from the URL between `/d/` and `/edit`, and set it as `SMOKE_TEST_SHEET_ID` in `.env`.

## The Scenario

| Position | Module | Config |
|---|---|---|
| 1 | `trigger.manual` | no config |
| 2 | `fb.list_ad_accounts` | no config |
| 3 | `sheets.find_rows` | spreadsheetId=$SMOKE_TEST_SHEET_ID, tabName=Leads, searchColumn=status, searchValue=new |
| 4 | `sheets.update_row` | spreadsheetId=$SMOKE_TEST_SHEET_ID, tabName=Leads, rowIdentifier="id=42", mappedFields={"status":"processed"} |
| 5 | `bitrix.create_lead` | title="Smoke test - Alice", name="Alice", email="alice@example.com", sourceId=OTHER, comments="Auto-created by adsync smoke test" |

## Running The Smoke Test

```bash
pnpm smoke:run
```

This script seeds the scenario via Prisma if it does not exist, triggers a manual run, and tails the RunLog output. It is equivalent to clicking through the UI but reproducible.

### What Success Looks Like

After running, verify:

1. **Run page** - `http://localhost:3000/runs/<runId>` shows 5 green step cards. Step 3 reports 1 matching row. Step 4 reports 1 row updated. Step 5 reports 1 lead created with a real Bitrix lead ID.
2. **Google Sheet** - row 2 of the Leads tab now has `status: processed`. The `id`, `name`, and `email` columns are unchanged.
3. **Bitrix24** - a new lead exists titled "Smoke test - Alice" with email `alice@example.com`, source `Other`, and the auto-created comment.

### What Failure Looks Like

- Step 5 shows `BitrixError: ACCESS_DENIED` - your webhook URL is wrong or the token expired. Reissue it in Bitrix admin.
- Step 4 says "No row found where id = 42" - the seed row in your test sheet is not there. Re-populate row 2.
- Step 3 returns 0 rows - the search column does not match. Verify the sheet's first-row header reads exactly `status`.
- Step 2 throws a Facebook or Google auth error - the OAuth token expired. Reconnect the provider in `/connections`.

## Re-running From A Step

In the run detail page, click "Re-run from this step" on step 4. This should produce a new run that:

- Skips steps 1, 2, and 3 by using sample rows captured from the original run.
- Re-executes step 4 (`sheets.update_row`) and step 5 (`bitrix.create_lead`).
- Creates one more new lead in Bitrix24. Idempotency is not enforced yet.

## Known v1 Behaviors

- Sample rows in RunLog are truncated to 3. Re-running uses truncated upstream data.
- Bitrix lead creation is not idempotent. Re-running creates duplicate leads. Future v2 enhancement: dedupe by email or phone.
- `bitrix.update_lead` is not in this scenario. To test it, manually add a step at position 6 with a known lead ID and `statusId=IN_PROCESS`.
- Template interpolation is not assumed here. The seeded smoke scenario uses literal values so Phase A can verify real data movement without depending on template expansion.

## When This Stops Being Canonical

Phase B introduces per-user webhook URLs and account scoping. After Phase B exit, this smoke test must run as a second registered user too: same scenario, isolated data. Update this document at that time.
