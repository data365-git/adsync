// MOCK callback — Phase 4 swaps this for the real Bitrix24 token exchange.
// Simulates the OAuth dance: upserts an OAuthConnection with an encrypted
// placeholder token and a fixed mock email + externalId.
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { encryptToken } from "~/lib/crypto";
import { ConnectionStatus, Provider } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code?.startsWith("mock-bitrix-")) {
    return NextResponse.redirect(
      new URL("/connections?error=bitrix_invalid_code", req.url),
    );
  }

  try {
    const encryptedToken = encryptToken("MOCK_BITRIX_TOKEN_FROM_PHASE_3_UI");
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    await db.oAuthConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: Provider.BITRIX24,
        },
      },
      update: {
        status: ConnectionStatus.CONNECTED,
        accessToken: encryptedToken,
        email: "mockuser@bitrix24.example.com",
        externalId: "mock_bitrix_user_001",
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        provider: Provider.BITRIX24,
        status: ConnectionStatus.CONNECTED,
        accessToken: encryptedToken,
        email: "mockuser@bitrix24.example.com",
        externalId: "mock_bitrix_user_001",
        expiresAt,
      },
    });

    return NextResponse.redirect(
      new URL("/connections?success=bitrix", req.url),
    );
  } catch (err) {
    console.error("[bitrix/callback] upsert failed:", err);
    return NextResponse.redirect(
      new URL("/connections?error=bitrix_upsert_failed", req.url),
    );
  }
}
