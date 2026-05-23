# Privacy Policy

**Effective date:** 2026-05-22

adsync is an internal automation dashboard operated by **data365.uz** (the "Operator"). It connects a single user's Facebook Ads, Google Sheets, and Bitrix24 accounts and copies that user's own data between those services on their behalf. This Privacy Policy describes what data adsync receives from Meta Platforms (Facebook), how it is used, stored, and deleted.

## 1. What data we receive

When you connect your Facebook account to adsync, we receive only the following Platform Data via the Marketing API:

- Your Facebook user ID and display name (for connection identification)
- The list of ad accounts you have access to (`act_*` ids, names, currency, status)
- Aggregate ad insights for accounts you select: impressions, clicks, spend, reach, CTR, CPM, CPC, and similar performance metrics — at the account, campaign, or ad level depending on the scenario you configure
- An OAuth access token issued by Meta with the scopes `ads_read` and `read_insights`

We do **not** request, store, or use:

- Personal messages, posts, comments, photos, or videos
- Profile information beyond user ID and display name
- Page or group data
- Audience targeting data or custom audience contents
- Data about people other than the operator of this adsync instance

## 2. How we use the data

The data is used solely to copy your own Facebook Ads performance metrics into your own Google Sheets, on the schedule and configuration you define inside adsync. The data is **not** analyzed, aggregated with other users' data, sold, or shared with any party other than the destination you choose (your own Google Sheets and/or Bitrix24 CRM).

## 3. How we store the data

- **Access tokens** issued by Meta are encrypted at rest using AES-256-GCM with a server-side encryption key. They are decrypted in memory only when needed to make an API call to Meta, then discarded.
- **Ad insights data** is written directly to your own Google Sheets at the moment a scenario runs. adsync does not maintain a persistent copy of the raw insights data on its own servers beyond a short-lived log entry for debugging (truncated to the first three rows).
- Servers are hosted on Railway (United States). The Postgres database used by adsync stores connection records, scenario definitions, run logs, and encrypted tokens.

## 4. Retention and deletion

- You can disconnect your Facebook connection at any time from `/connections` in adsync. On disconnect, the `OAuthConnection` row holding your encrypted token is deleted within seconds.
- Run logs are retained for diagnostic purposes. You can delete all run history from `/settings/danger` ("Reset all runs").
- You can request full account deletion from `/settings/danger` ("Delete account"). All your data — including encrypted tokens, scenarios, folders, and run logs — is permanently removed.

## 5. Third-party processors

adsync uses the following service providers:

- **Railway Corp.** — application + database hosting (United States)
- **Google LLC** — Google Sheets destination (data is written to spreadsheets you own; we do not control retention there)
- **Bitrix24** — optional CRM destination if you choose to write leads to your Bitrix CRM

## 6. Your rights

You have the right to:

- Access the data adsync has collected about your Facebook connection
- Disconnect Facebook at any time
- Request deletion of your account and all associated data
- Object to processing of your data

To exercise any of these rights, use the `/connections` or `/settings/danger` pages, or contact us at the email below.

## 7. Children

adsync is intended for use by businesses and is not directed to children under 13. We do not knowingly collect data from children.

## 8. Changes to this Policy

We may update this Privacy Policy from time to time. The "Effective date" at the top reflects the latest revision. Material changes will be communicated via the adsync dashboard.

## 9. Contact

Operator: **data365.uz**
Contact email: **data365.services@gmail.com**
