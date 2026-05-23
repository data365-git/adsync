export const metadata = {
  title: "Privacy Policy — adsync",
};

const paragraphClass = "text-sm leading-relaxed text-slate-700";
const h2Class = "mt-8 mb-3 text-lg font-semibold text-slate-900";
const listClass = "my-3 list-disc space-y-1 pl-6 text-sm text-slate-700";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-900">
      <article>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Privacy Policy
        </h1>
        <p className={paragraphClass}>
          <strong className="font-medium text-slate-900">Effective date:</strong>{" "}
          2026-05-22
        </p>
        <p className={paragraphClass}>
          adsync is an internal automation dashboard operated by data365.uz (the
          &apos;Operator&apos;). It connects a single user&apos;s Facebook Ads,
          Google Sheets, and Bitrix24 accounts and copies that user&apos;s own
          data between those services on their behalf. This Privacy Policy
          describes what data adsync receives from Meta Platforms (Facebook), how
          it is used, stored, and deleted.
        </p>

        <h2 className={h2Class}>1. What data we receive</h2>
        <p className={paragraphClass}>
          When you connect your Facebook account to adsync, we receive only the
          following Platform Data via the Marketing API:
        </p>
        <ul className={listClass}>
          <li>
            Your Facebook user ID and display name (for connection
            identification)
          </li>
          <li>
            The list of ad accounts you have access to (act_* ids, names,
            currency, status)
          </li>
          <li>
            Aggregate ad insights for accounts you select: impressions, clicks,
            spend, reach, CTR, CPM, CPC, and similar performance metrics — at
            the account, campaign, or ad level depending on the scenario you
            configure.
          </li>
          <li>
            An OAuth access token issued by Meta with the scopes ads_read and
            read_insights.
          </li>
        </ul>
        <p className={paragraphClass}>We do NOT request, store, or use:</p>
        <ul className={listClass}>
          <li>Personal messages, posts, comments, photos, or videos</li>
          <li>Profile information beyond user ID and display name</li>
          <li>Page or group data</li>
          <li>Audience targeting data or custom audience contents</li>
          <li>Data about people other than the operator of this adsync instance</li>
        </ul>

        <h2 className={h2Class}>2. How we use the data</h2>
        <p className={paragraphClass}>
          The data is used solely to copy your own Facebook Ads performance
          metrics into your own Google Sheets, on the schedule and configuration
          you define inside adsync. The data is not analyzed, aggregated with
          other users&apos; data, sold, or shared with any party other than the
          destination you choose (your own Google Sheets and/or Bitrix24 CRM).
        </p>

        <h2 className={h2Class}>3. How we store the data</h2>
        <ul className={listClass}>
          <li>
            Access tokens issued by Meta are encrypted at rest using AES-256-GCM
            with a server-side encryption key. They are decrypted in memory only
            when needed to make an API call to Meta, then discarded.
          </li>
          <li>
            Ad insights data is written directly to your own Google Sheets at
            the moment a scenario runs. adsync does not maintain a persistent
            copy of the raw insights data on its own servers beyond a
            short-lived log entry for debugging (truncated to the first three
            rows).
          </li>
          <li>
            Servers are hosted on Railway (United States). The Postgres database
            used by adsync stores connection records, scenario definitions, run
            logs, and encrypted tokens.
          </li>
        </ul>

        <h2 className={h2Class}>4. Retention and deletion</h2>
        <ul className={listClass}>
          <li>
            You can disconnect your Facebook connection at any time from
            /connections in adsync. On disconnect, the OAuthConnection row
            holding your encrypted token is deleted within seconds.
          </li>
          <li>
            Run logs are retained for diagnostic purposes. You can delete all run
            history from /settings/danger (&apos;Reset all runs&apos;).
          </li>
          <li>
            You can request full account deletion from /settings/danger
            (&apos;Delete account&apos;). All your data — including encrypted
            tokens, scenarios, folders, and run logs — is permanently removed.
          </li>
        </ul>

        <h2 className={h2Class}>5. Third-party processors</h2>
        <p className={paragraphClass}>
          adsync uses the following service providers:
        </p>
        <ul className={listClass}>
          <li>Railway Corp. — application + database hosting (United States)</li>
          <li>
            Google LLC — Google Sheets destination (data is written to
            spreadsheets you own; we do not control retention there)
          </li>
          <li>
            Bitrix24 — optional CRM destination if you choose to write leads to
            your Bitrix CRM
          </li>
        </ul>

        <h2 className={h2Class}>6. Your rights</h2>
        <p className={paragraphClass}>You have the right to:</p>
        <ul className={listClass}>
          <li>
            Access the data adsync has collected about your Facebook connection
          </li>
          <li>Disconnect Facebook at any time</li>
          <li>Request deletion of your account and all associated data</li>
          <li>Object to processing of your data</li>
        </ul>
        <p className={paragraphClass}>
          To exercise any of these rights, use the /connections or
          /settings/danger pages, or contact us at the email below.
        </p>

        <h2 className={h2Class}>7. Children</h2>
        <p className={paragraphClass}>
          adsync is intended for use by businesses and is not directed to
          children under 13. We do not knowingly collect data from children.
        </p>

        <h2 className={h2Class}>8. Changes to this Policy</h2>
        <p className={paragraphClass}>
          We may update this Privacy Policy from time to time. The
          &apos;Effective date&apos; at the top reflects the latest revision.
          Material changes will be communicated via the adsync dashboard.
        </p>

        <h2 className={h2Class}>9. Contact</h2>
        <p className={paragraphClass}>Operator: data365.uz</p>
        <p className={paragraphClass}>
          Contact email: data365.services@gmail.com
        </p>
      </article>
    </main>
  );
}
