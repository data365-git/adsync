import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),

    // ── Core infrastructure (required) ──────────────────────────────────────
    // Postgres connection string. Railway: from the Postgres add-on's
    // `DATABASE_URL` variable reference (e.g. ${{Postgres.DATABASE_URL}}).
    DATABASE_URL: z.string().url(),

    // ── NextAuth (required) ─────────────────────────────────────────────────
    // 32+ byte random string. Generate: `openssl rand -base64 32`.
    NEXTAUTH_SECRET: z.string().min(32),
    // Public URL of the deployed app (no trailing slash).
    NEXTAUTH_URL: z.string().url(),

    // ── Google OAuth — login provider (required) ───────────────────────────
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    // ── Token encryption (required) ─────────────────────────────────────────
    // 64-character hex = 32-byte AES-256 key. `openssl rand -hex 32`.
    TOKEN_ENC_KEY: z.string().length(64),

    // ── Allowlist (required) ────────────────────────────────────────────────
    // Comma-separated emails that may sign in. Single-user app: just one.
    ALLOWLIST_EMAIL: z.string().min(1),

    // ── Google OAuth — Sheets data source (optional, needed to connect) ────
    GOOGLE_OAUTH_SHEETS_CLIENT_ID: z.string().optional(),
    GOOGLE_OAUTH_SHEETS_CLIENT_SECRET: z.string().optional(),

    // ── Facebook OAuth — ad data source (optional, needed to connect) ──────
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),
    FB_GRAPH_API_VERSION: z.string().default("v22.0"),
    // When the FB app is still in review, the OAuth UX is degraded. Set to
    // "true" to surface a banner that explains the limitation.
    FACEBOOK_APP_REVIEW_PENDING: z.enum(["true", "false"]).default("false"),

    // ── Worker (optional — only needed on the worker service) ───────────────
    WORKER_ENABLED: z.enum(["true", "false"]).default("false"),
    WORKER_TICK_INTERVAL_MS: z.coerce.number().default(60_000),

    // ── Bitrix24 sync (optional) ────────────────────────────────────────────
    // Full inbound webhook URL: https://{portal}/rest/{userId}/{token}/
    BITRIX24_WEBHOOK_URL: z.string().url().optional(),

    // ── Google Sheets sync (optional) ───────────────────────────────────────
    GOOGLE_SHEETS_ID: z.string().optional(),
    GOOGLE_SHEETS_TAB_LEADS: z.string().default("Leads"),
    GOOGLE_SHEETS_TAB_DEALS: z.string().default("Deals"),
    GOOGLE_SHEETS_TAB_CONTACTS: z.string().default("Contacts"),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
    GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
    SHEETS_POLL_INTERVAL_MS: z.coerce.number().default(10_000),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TOKEN_ENC_KEY: process.env.TOKEN_ENC_KEY,
    ALLOWLIST_EMAIL: process.env.ALLOWLIST_EMAIL,
    GOOGLE_OAUTH_SHEETS_CLIENT_ID: process.env.GOOGLE_OAUTH_SHEETS_CLIENT_ID,
    GOOGLE_OAUTH_SHEETS_CLIENT_SECRET: process.env.GOOGLE_OAUTH_SHEETS_CLIENT_SECRET,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    FB_GRAPH_API_VERSION: process.env.FB_GRAPH_API_VERSION,
    FACEBOOK_APP_REVIEW_PENDING: process.env.FACEBOOK_APP_REVIEW_PENDING,
    WORKER_ENABLED: process.env.WORKER_ENABLED,
    WORKER_TICK_INTERVAL_MS: process.env.WORKER_TICK_INTERVAL_MS,
    BITRIX24_WEBHOOK_URL: process.env.BITRIX24_WEBHOOK_URL,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_SHEETS_TAB_LEADS: process.env.GOOGLE_SHEETS_TAB_LEADS,
    GOOGLE_SHEETS_TAB_DEALS: process.env.GOOGLE_SHEETS_TAB_DEALS,
    GOOGLE_SHEETS_TAB_CONTACTS: process.env.GOOGLE_SHEETS_TAB_CONTACTS,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    SHEETS_POLL_INTERVAL_MS: process.env.SHEETS_POLL_INTERVAL_MS,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
