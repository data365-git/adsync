import { db } from "~/server/db";
import { Provider, ConnectionStatus } from "@prisma/client";
import { encryptToken, decryptToken } from "~/lib/crypto";
import { google } from "googleapis";

// openid / email / profile are required so we can call oauth2.userinfo.get()
// after the token exchange to display which Google account is connected.
// spreadsheets is the actual data-source scope.
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
];

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_SHEETS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_SHEETS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_SHEETS_CLIENT_ID and GOOGLE_OAUTH_SHEETS_CLIENT_SECRET must be set",
    );
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${process.env.NEXTAUTH_URL}/api/oauth/google/callback`,
  );
}

export function getAuthorizationUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // force refresh_token on every auth
    state,
  });
}

export async function exchangeCode(code: string, userId: string): Promise<void> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("No access_token in Google token response");

  // Get user's Google email for display
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  await db.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider: Provider.GOOGLE_SHEETS } },
    create: {
      userId,
      provider: Provider.GOOGLE_SHEETS,
      status: ConnectionStatus.CONNECTED,
      email: profile.email ?? null,
      externalId: profile.id ?? null,
      accessToken: encryptToken(tokens.access_token),         // encrypted at rest
      refreshToken: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)                  // encrypted at rest
        : null,
      scope: SCOPES.join(" "),
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      status: ConnectionStatus.CONNECTED,
      accessToken: encryptToken(tokens.access_token),         // encrypted at rest
      refreshToken: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)                  // encrypted at rest
        : undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      email: profile.email ?? null,
    },
  });
}

/**
 * Returns an authenticated Google OAuth2 client for the given userId.
 * Automatically refreshes the access token if it is expired or expiring within 5 minutes.
 */
export async function getAuthedClient(userId: string) {
  const conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: Provider.GOOGLE_SHEETS } },
  });
  if (!conn || conn.status === ConnectionStatus.DISCONNECTED) {
    throw new Error("Google Sheets not connected. Please reconnect from /connections.");
  }

  const client = getOAuthClient();
  const accessToken = decryptToken(conn.accessToken);          // decrypted for use
  const refreshToken = conn.refreshToken
    ? decryptToken(conn.refreshToken)                          // decrypted for use
    : undefined;
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

  // Refresh proactively if expiring within 5 min
  if (conn.expiresAt && conn.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    await db.oAuthConnection.update({
      where: { userId_provider: { userId, provider: Provider.GOOGLE_SHEETS } },
      data: {
        accessToken: encryptToken(credentials.access_token!), // re-encrypted after refresh
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
        status: ConnectionStatus.CONNECTED,
      },
    });
  }

  return client;
}
