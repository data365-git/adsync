import { db } from "~/server/db";
import { Provider, ConnectionStatus } from "@prisma/client";
import { encryptToken, decryptToken } from "~/lib/crypto";

const FB_VERSION = process.env.FB_GRAPH_API_VERSION ?? "v22.0";
const APP_ID = process.env.FACEBOOK_APP_ID!;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET!;

export function getAuthorizationUrl(state: string): string {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/facebook/callback`;
  const scopes = "ads_read,read_insights";
  return (
    `https://www.facebook.com/${FB_VERSION}/dialog/oauth` +
    `?client_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}`
  );
}

/**
 * Exchange a short-lived code for a long-lived (~60 day) user access token.
 * Stores the long-lived token encrypted in OAuthConnection.
 */
export async function exchangeCode(code: string, userId: string): Promise<void> {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/facebook/callback`;

  // Step 1: short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/${FB_VERSION}/oauth/access_token` +
      `?client_id=${APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${APP_SECRET}` +
      `&code=${code}`,
  );
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: { message: string };
  };
  if (!tokenData.access_token) {
    throw new Error(
      `FB token exchange failed: ${tokenData.error?.message ?? "unknown"}`,
    );
  }

  // Step 2: long-lived token (valid ~60 days — FB doesn't have refresh_token flow)
  const longRes = await fetch(
    `https://graph.facebook.com/${FB_VERSION}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}` +
      `&fb_exchange_token=${tokenData.access_token}`,
  );
  const longData = (await longRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };
  if (!longData.access_token) {
    throw new Error(
      `FB long-lived token exchange failed: ${longData.error?.message ?? "unknown"}`,
    );
  }

  // Step 3: get FB user info for externalId + email
  const meRes = await fetch(
    `https://graph.facebook.com/${FB_VERSION}/me?fields=id,email&access_token=${longData.access_token}`,
  );
  const me = (await meRes.json()) as { id?: string; email?: string };

  const expiresAt = longData.expires_in
    ? new Date(Date.now() + longData.expires_in * 1000)
    : null;

  await db.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider: Provider.FACEBOOK } },
    create: {
      userId,
      provider: Provider.FACEBOOK,
      status: ConnectionStatus.CONNECTED,
      email: me.email ?? null,
      externalId: me.id ?? null,
      accessToken: encryptToken(longData.access_token), // encrypted at rest
      refreshToken: null, // FB long-lived tokens are not refreshed; user reauthorizes
      scope: "ads_read,read_insights",
      expiresAt,
    },
    update: {
      status: ConnectionStatus.CONNECTED,
      accessToken: encryptToken(longData.access_token), // encrypted at rest
      expiresAt,
      email: me.email ?? null,
      externalId: me.id ?? null,
    },
  });
}

/** Get the decrypted access token for a user's FB connection. */
export async function getFbAccessToken(userId: string): Promise<string> {
  const conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: Provider.FACEBOOK } },
  });
  if (conn === null || conn === undefined) {
    throw new Error(
      "Facebook not connected. Please reconnect from /connections.",
    );
  }
  if (conn.status !== ConnectionStatus.CONNECTED) {
    throw new Error(
      "Facebook not connected. Please reconnect from /connections.",
    );
  }
  return decryptToken(conn.accessToken); // decrypted only at use-time, never logged
}
