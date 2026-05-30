import { beforeEach, describe, expect, it, vi } from "vitest";
import { BitrixConnectionKind, ConnectionStatus } from "@prisma/client";

const upsertMock = vi.hoisted(() => vi.fn(async (_arg: unknown) => ({})));
const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("~/server/db", () => ({
  db: { bitrixPortal: { upsert: upsertMock, findUnique: findUniqueMock } },
}));

// Identity crypto so we can assert on stored values without a real key.
vi.mock("~/lib/crypto", () => ({
  encryptToken: (s: string) => `enc(${s})`,
  decryptToken: (s: string) => s.replace(/^enc\(/, "").replace(/\)$/, ""),
}));

// Avoid pulling googleapis through the real google/oauth module.
vi.mock("~/integrations/google/oauth", () => ({
  TokenRefreshError: class TokenRefreshError extends Error {},
}));

import { connectWebhook, getPortalAuth } from "../oauth";

describe("connectWebhook", () => {
  beforeEach(() => {
    upsertMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("rejects a non-https URL", async () => {
    await expect(
      connectWebhook("u1", "http://x.bitrix24.com/rest/1/t/"),
    ).rejects.toThrow(/https/i);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects a URL that isn't an inbound webhook", async () => {
    await expect(
      connectWebhook("u1", "https://x.bitrix24.com/crm/lead/"),
    ).rejects.toThrow(/inbound webhook/i);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects when the webhook is unreachable (network failure)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    await expect(
      connectWebhook("u1", "https://x.bitrix24.com/rest/1/tok/"),
    ).rejects.toThrow(/couldn't reach/i);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("surfaces the Bitrix error when the portal rejects the webhook", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({
          error: "ACCESS_DENIED",
          error_description: "REST is available only by subscription.",
        }),
      })),
    );
    await expect(
      connectWebhook("u1", "https://x.bitrix24.com/rest/1/tok/"),
    ).rejects.toThrow(/REST is available only by subscription/i);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts a WEBHOOK portal with synthetic memberId + encrypted base", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ result: {} }) })),
    );
    const res = await connectWebhook(
      "u1",
      "https://acme.bitrix24.com/rest/1/tok/",
    );
    expect(res.domain).toBe("acme.bitrix24.com");
    expect(upsertMock).toHaveBeenCalledOnce();
    const arg = upsertMock.mock.calls[0]![0] as {
      where: { userId_memberId: { memberId: string } };
      create: { kind: string; webhookUrl: string; domain: string };
    };
    expect(arg.where.userId_memberId.memberId).toBe("webhook:acme.bitrix24.com");
    expect(arg.create.kind).toBe(BitrixConnectionKind.WEBHOOK);
    expect(arg.create.webhookUrl).toBe("enc(https://acme.bitrix24.com/rest/1/tok)");
  });
});

describe("getPortalAuth — webhook portal", () => {
  beforeEach(() => findUniqueMock.mockReset());

  it("returns null auth + decrypted webhook base and never refreshes", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "p1",
      kind: BitrixConnectionKind.WEBHOOK,
      status: ConnectionStatus.CONNECTED,
      webhookUrl: "enc(https://acme.bitrix24.com/rest/1/tok)",
      accessToken: null,
      refreshToken: null,
      clientEndpoint: "https://acme.bitrix24.com/rest/",
      expiresAt: null,
    });
    const r = await getPortalAuth("p1");
    expect(r.accessToken).toBeNull();
    expect(r.clientEndpoint).toBe("https://acme.bitrix24.com/rest/1/tok");
  });
});
