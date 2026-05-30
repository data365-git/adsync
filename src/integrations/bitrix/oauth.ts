import { db } from "~/server/db";
import { ConnectionStatus, BitrixConnectionKind } from "@prisma/client";
import { encryptToken, decryptToken } from "~/lib/crypto";
import { TokenRefreshError } from "~/integrations/google/oauth";

// Bitrix24 OAuth 2.0 (server-side app).
//   Authorize:  https://<portal>/oauth/authorize/?client_id=..&response_type=code&state=..
//   Token/refresh: https://oauth.bitrix.info/oauth/token/  (central endpoint)
// The token response carries the portal `domain`, `member_id`, and the REST
// base `client_endpoint` — so one app (one client_id/secret) serves every
// portal a user authorizes. Tokens are encrypted at rest via TOKEN_ENC_KEY.
const TOKEN_ENDPOINT = "https://oauth.bitrix.info/oauth/token/";
const DEFAULT_SCOPE = "crm";

function clientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.BITRIX24_CLIENT_ID;
  const clientSecret = process.env.BITRIX24_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "BITRIX24_CLIENT_ID and BITRIX24_CLIENT_SECRET must be set",
    );
  }
  return { clientId, clientSecret };
}

/** Reduce any user-entered portal value to a bare host, e.g. "co.bitrix24.com". */
export function normalizePortalDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

/** Authorize URL for a specific portal. The user logs into that portal and approves. */
export function getAuthorizationUrl(portalDomain: string, state: string): string {
  const { clientId } = clientCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
  });
  return `https://${normalizePortalDomain(portalDomain)}/oauth/authorize/?${params.toString()}`;
}

type BitrixTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  domain?: string;
  member_id: string;
  client_endpoint: string;
  server_endpoint?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(
  params: Record<string, string>,
): Promise<BitrixTokenResponse> {
  const url = `${TOKEN_ENDPOINT}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "GET" });
  const json = (await res.json()) as Partial<BitrixTokenResponse>;
  if (!res.ok || json.error || !json.access_token || !json.member_id) {
    throw new Error(
      `Bitrix token error: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim(),
    );
  }
  return json as BitrixTokenResponse;
}

/** Exchange an authorization code for tokens and persist the portal connection. */
export async function exchangeCode(
  code: string,
  userId: string,
): Promise<{ domain: string }> {
  const { clientId, clientSecret } = clientCreds();
  const tok = await tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
  });
  // Derive the portal host from client_endpoint — Bitrix's `domain` field can
  // return the auth server (oauth.bitrix.info), not the portal itself.
  const domain = normalizePortalDomain(tok.client_endpoint);
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000);

  await db.bitrixPortal.upsert({
    where: { userId_memberId: { userId, memberId: tok.member_id } },
    create: {
      userId,
      memberId: tok.member_id,
      domain,
      clientEndpoint: tok.client_endpoint,
      accessToken: encryptToken(tok.access_token),
      refreshToken: encryptToken(tok.refresh_token),
      scope: tok.scope ?? DEFAULT_SCOPE,
      status: ConnectionStatus.CONNECTED,
      expiresAt,
    },
    update: {
      domain,
      clientEndpoint: tok.client_endpoint,
      accessToken: encryptToken(tok.access_token),
      refreshToken: encryptToken(tok.refresh_token),
      scope: tok.scope ?? DEFAULT_SCOPE,
      status: ConnectionStatus.CONNECTED,
      expiresAt,
    },
  });
  return { domain };
}

/**
 * Connect a Bitrix24 portal via an inbound REST webhook URL the user pastes
 * (https://<portal>/rest/<userId>/<token>/). No OAuth app required — good for
 * a small set of users who each generate a webhook in their own portal. The
 * webhook base is verified live, then stored encrypted as a WEBHOOK portal so
 * it flows through the same portalId selector + enforcement as OAuth portals.
 */
export async function connectWebhook(
  userId: string,
  rawUrl: string,
): Promise<{ domain: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must start with https://");
  }
  const parts = url.pathname.split("/").filter(Boolean); // ["rest", "<uid>", "<token>"]
  if (parts[0] !== "rest" || parts.length < 3) {
    throw new Error(
      "Not a Bitrix24 inbound webhook URL — expected https://<portal>/rest/<id>/<token>/",
    );
  }
  const host = url.hostname.toLowerCase();
  const base = `${url.origin}/${parts.slice(0, 3).join("/")}`; // normalized, no trailing slash

  // Verify the webhook is live before persisting (profile is available on any scope).
  const res = await fetch(`${base}/profile.json`, { method: "POST" }).catch(
    () => null,
  );
  if (!res) {
    throw new Error("Couldn't reach that webhook — check the URL and your connection.");
  }
  const json = (await res.json().catch(() => null)) as
    | { error?: string; error_description?: string }
    | null;
  if (!res.ok || json?.error) {
    const detail = json?.error_description ?? json?.error ?? `HTTP ${res.status}`;
    throw new Error(`Bitrix rejected the webhook: ${detail}`);
  }

  const memberId = `webhook:${host}`;
  const shared = {
    domain: host,
    clientEndpoint: `${url.origin}/rest/`,
    webhookUrl: encryptToken(base),
    kind: BitrixConnectionKind.WEBHOOK,
    status: ConnectionStatus.CONNECTED,
    expiresAt: null,
  };
  await db.bitrixPortal.upsert({
    where: { userId_memberId: { userId, memberId } },
    create: { userId, memberId, ...shared },
    update: shared,
  });
  return { domain: host };
}

/** Portal origin (https://domain) for building deep links — no token needed. */
export async function getPortalOrigin(portalId: string): Promise<string | null> {
  const portal = await db.bitrixPortal.findUnique({
    where: { id: portalId },
    select: { domain: true },
  });
  return portal ? `https://${portal.domain}` : null;
}

/**
 * Return a usable access token + REST base for a connected portal, refreshing
 * proactively when it expires within 5 minutes. Throws TokenRefreshError if the
 * portal is disconnected or the refresh fails (so callers prompt a reconnect).
 */
export async function getPortalAuth(
  portalId: string,
): Promise<{ accessToken: string | null; clientEndpoint: string }> {
  const portal = await db.bitrixPortal.findUnique({ where: { id: portalId } });
  if (!portal || portal.status === ConnectionStatus.DISCONNECTED) {
    throw new TokenRefreshError("Bitrix");
  }

  // Webhook portals: the (encrypted) webhook URL is itself the authenticated
  // REST base — no bearer token, no refresh. `call()` omits the ?auth= param
  // when accessToken is null, hitting the webhook URL directly.
  if (portal.kind === BitrixConnectionKind.WEBHOOK) {
    if (!portal.webhookUrl) throw new TokenRefreshError("Bitrix");
    return { accessToken: null, clientEndpoint: decryptToken(portal.webhookUrl) };
  }

  if (!portal.accessToken || !portal.refreshToken) {
    throw new TokenRefreshError("Bitrix");
  }
  let accessToken = decryptToken(portal.accessToken);
  let clientEndpoint = portal.clientEndpoint;

  if (portal.expiresAt && portal.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { clientId, clientSecret } = clientCreds();
    try {
      const tok = await tokenRequest({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: decryptToken(portal.refreshToken),
      });
      accessToken = tok.access_token;
      clientEndpoint = tok.client_endpoint ?? portal.clientEndpoint;
      await db.bitrixPortal.update({
        where: { id: portal.id },
        data: {
          accessToken: encryptToken(tok.access_token),
          refreshToken: encryptToken(tok.refresh_token),
          clientEndpoint,
          scope: tok.scope ?? portal.scope,
          expiresAt: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000),
          status: ConnectionStatus.CONNECTED,
        },
      });
    } catch {
      await db.bitrixPortal.update({
        where: { id: portal.id },
        data: { status: ConnectionStatus.EXPIRED },
      });
      throw new TokenRefreshError("Bitrix");
    }
  }

  return { accessToken, clientEndpoint };
}
