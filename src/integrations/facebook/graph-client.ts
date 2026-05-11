import { getFbAccessToken } from "./oauth";

const FB_VERSION = process.env.FB_GRAPH_API_VERSION ?? "v22.0";
const BASE = `https://graph.facebook.com/${FB_VERSION}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightLevel = "account" | "campaign" | "ad";

export interface InsightsQuery {
  fbAccountId: string; // e.g. "act_123456789"
  level: InsightLevel;
  metrics: string[];
  dateWindowDays: number;
}

export type InsightRow = Record<string, string | number>;

// ─── Stub mode ───────────────────────────────────────────────────────────────
// When FACEBOOK_APP_REVIEW_PENDING=true, return sample-shaped rows instead of
// calling the real API. Allows development before App Review is complete.

function isStubMode(): boolean {
  return process.env.FACEBOOK_APP_REVIEW_PENDING === "true";
}

function stubRows(metrics: string[], n = 3): InsightRow[] {
  return Array.from({ length: n }, (_, i) => ({
    date_start: new Date(Date.now() - (i + 1) * 86400000)
      .toISOString()
      .slice(0, 10),
    account_id: "act_stub_123",
    campaign_id: `stub_cmp_${i + 1}`,
    ad_id: `stub_ad_${i + 1}`,
    ...Object.fromEntries(
      metrics.map((m) => [m, Math.floor(Math.random() * 1000)]),
    ),
  }));
}

// ─── Real API calls ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = (await res
      .json()
      .catch(() => ({ error: { message: res.statusText } }))) as {
      error: { message: string };
    };
    throw new Error(`FB Graph API error: ${err.error?.message ?? res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function buildInsightsUrl(
  fbAccountId: string,
  level: InsightLevel,
  metrics: string[],
  dateWindowDays: number,
): string {
  const fields = [
    "date_start",
    "account_id",
    "campaign_id",
    "ad_id",
    ...metrics,
  ].join(",");
  const datePreset =
    dateWindowDays <= 7
      ? "last_7d"
      : dateWindowDays <= 14
        ? "last_14d"
        : "last_30d";
  return (
    `${BASE}/${fbAccountId}/insights` +
    `?level=${level}` +
    `&fields=${fields}` +
    `&date_preset=${datePreset}` +
    `&limit=500`
  );
}

export async function getAccountInsights(
  userId: string,
  query: InsightsQuery,
): Promise<InsightRow[]> {
  if (isStubMode()) return stubRows(query.metrics);
  const token = await getFbAccessToken(userId);
  const url = buildInsightsUrl(
    query.fbAccountId,
    "account",
    query.metrics,
    query.dateWindowDays,
  );
  const data = await fetchJson<{ data: InsightRow[] }>(url, token);
  return data.data ?? [];
}

export async function getCampaignInsights(
  userId: string,
  query: InsightsQuery,
): Promise<InsightRow[]> {
  if (isStubMode()) return stubRows(query.metrics);
  const token = await getFbAccessToken(userId);
  const url = buildInsightsUrl(
    query.fbAccountId,
    "campaign",
    query.metrics,
    query.dateWindowDays,
  );
  const data = await fetchJson<{ data: InsightRow[] }>(url, token);
  return data.data ?? [];
}

export async function getAdInsights(
  userId: string,
  query: InsightsQuery,
): Promise<InsightRow[]> {
  if (isStubMode()) return stubRows(query.metrics);
  const token = await getFbAccessToken(userId);
  const url = buildInsightsUrl(
    query.fbAccountId,
    "ad",
    query.metrics,
    query.dateWindowDays,
  );
  const data = await fetchJson<{ data: InsightRow[] }>(url, token);
  return data.data ?? [];
}

export async function listAdAccounts(
  userId: string,
): Promise<{ id: string; name: string }[]> {
  if (isStubMode()) {
    return [
      { id: "act_stub_001", name: "Stub Account — Dev Mode" },
      { id: "act_stub_002", name: "Stub Account 2 — Dev Mode" },
    ];
  }
  const token = await getFbAccessToken(userId);
  const url = `${BASE}/me/adaccounts?fields=account_id,name&limit=50`;
  const data = await fetchJson<{
    data: Array<{ id: string; account_id: string; name: string }>;
  }>(url, token);
  return (data.data ?? []).map((a) => ({ id: a.id, name: a.name }));
}
