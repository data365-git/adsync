# Module Catalog Audit (2026-05-14)

Decision legend:
- **KEEP-IMPL** — keep in catalog, implement in Phase A (Plans 2–4)
- **DEFER** — keep in catalog but route to `notImplementedHandler` (loud failure) until later
- **CUT** — remove from catalog entirely

## Already real (no action — for reference)

| Module type | Handler |
|---|---|
| `fb.account_insights` | `fbAccountInsightsHandler` |
| `fb.campaign_insights` | `fbCampaignInsightsHandler` |
| `fb.ad_insights` | `fbAdInsightsHandler` |
| `sheets.append` | `sheetsAppendHandler` |
| `sheets.upsert` | `sheetsUpsertHandler` |
| All `trigger.*` | trigger handlers (no-op data movement) |

## Currently mocked — decision required

| Module type | Group | Plain-language purpose | Recommendation | User decision |
|---|---|---|---|---|
| `fb.list_ad_accounts` | facebook | List the user's ad accounts (used by AdAccount picker) | KEEP-IMPL | _____ |
| `fb.list_ads` | facebook | List ads under an account/campaign | DEFER | _____ |
| `fb.get_ad` | facebook | Fetch a single ad by id | DEFER | _____ |
| `sheets.find_rows` | sheets | Find rows matching a filter | KEEP-IMPL | _____ |
| `sheets.update_row` | sheets | Update a row by id/match | KEEP-IMPL | _____ |
| `sheets.delete_row` | sheets | Delete a row | DEFER | _____ |
| `sheets.get_row` | sheets | Fetch a single row by id | DEFER | _____ |
| `sheets.create_tab` | sheets | Create a new sheet tab | DEFER | _____ |
| `sheets.watch_new_rows` | sheets | Polling trigger for new rows | DEFER | _____ |
| `bitrix.create_lead` | bitrix24 | Create a Bitrix24 lead | KEEP-IMPL | _____ |
| `bitrix.update_lead` | bitrix24 | Update a lead by id | KEEP-IMPL | _____ |
| `bitrix.find_leads` | bitrix24 | Search leads by filter | DEFER | _____ |
| `bitrix.create_deal` | bitrix24 | Create a deal | DEFER | _____ |
| `bitrix.update_deal` | bitrix24 | Update a deal by id | DEFER | _____ |
| `bitrix.create_smart_process_item` | bitrix24 | Create a Bitrix smart-process item | CUT | _____ |

## Rationale for the default recommendations

- **KEEP-IMPL** are the minimum to make the canonical smoke-test scenario in master-plan §5.A.6 work end-to-end: FB → Sheets → Bitrix lead creation/update, plus the ad-account picker.
- **DEFER** are plausible v2 features. They stay in the catalog (so the UI can still display them) but executing a step of that type fails loudly. No silent green.
- **CUT** is reserved for modules that don't fit the v1 product shape. `bitrix.create_smart_process_item` is recommended as the lone cut because smart-process items require per-entity-type config that we're not building UI for.

## How to use this doc

Fill in the **User decision** column for every row, then signal Task 3 to proceed. Plan 1 enacts the decisions verbatim in Tasks 4–8.

---

## Resolved (locked 2026-05-14)

**CUT (removed from catalog in commit `343282a`):**
- `bitrix.create_smart_process_item`

**DEFER (routed to `notImplementedHandler` in commit `a0580c9`):**
- `fb.list_ads`
- `fb.get_ad`
- `sheets.delete_row`
- `sheets.get_row`
- `sheets.create_tab`
- `sheets.watch_new_rows`
- `bitrix.find_leads`
- `bitrix.create_deal`
- `bitrix.update_deal`

**KEEP-IMPL (real handler still required — implemented in subsequent plans):**
- Plan 2 (Facebook): `fb.list_ad_accounts`
- Plan 3 (Sheets): `sheets.find_rows`, `sheets.update_row`
- Plan 4 (Bitrix24): `bitrix.create_lead`, `bitrix.update_lead`

Until those plans land, the KEEP-IMPL types still route to `mockActionHandler` in `src/server/core/module-handlers.ts`. They are the only remaining mocks in the codebase.
