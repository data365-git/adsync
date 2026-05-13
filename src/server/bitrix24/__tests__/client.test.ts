// Set env var BEFORE any imports that may read it at module load time.
process.env.BITRIX24_WEBHOOK_URL = "https://test.bitrix24.com/rest/1/testtoken/";

import { beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` would throw outside of a server build — neutralize it for tests.
vi.mock("server-only", () => ({}));

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadClient() {
  return import("../client");
}

async function loadTypes() {
  return import("../types");
}

beforeEach(() => {
  // Reset module state (lastCallAt counter) between tests.
  vi.resetModules();
  vi.unstubAllGlobals();
  process.env.BITRIX24_WEBHOOK_URL = "https://test.bitrix24.com/rest/1/testtoken/";
});

describe("call", () => {
  it("sends POST to {BITRIX24_WEBHOOK_URL}/{method}.json with correct body", async () => {
    const mockFetch: FetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ result: { ok: true } }));
    vi.stubGlobal("fetch", mockFetch);

    const { call } = await loadClient();
    await call("crm.lead.add", { fields: { TITLE: "Acme" } });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://test.bitrix24.com/rest/1/testtoken/crm.lead.add.json",
    );
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      fields: { TITLE: "Acme" },
    });
  });

  it("returns the `result` field from the response", async () => {
    const mockFetch: FetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ result: 12345 }));
    vi.stubGlobal("fetch", mockFetch);

    const { call } = await loadClient();
    const result = await call<number>("crm.lead.add", { fields: {} });
    expect(result).toBe(12345);
  });

  it("throws BitrixError when the response contains an `error` field", async () => {
    // `Response.json()` consumes the body; return a fresh response per call.
    const mockFetch: FetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          error: "ACCESS_DENIED",
          error_description: "Insufficient scope",
        }),
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { call } = await loadClient();
    const { BitrixError } = await loadTypes();

    await expect(call("crm.lead.add", {})).rejects.toBeInstanceOf(BitrixError);
    await expect(call("crm.lead.add", {})).rejects.toMatchObject({
      code: "ACCESS_DENIED",
      description: "Insufficient scope",
      method: "crm.lead.add",
    });
  }, 15_000);

  it("retries on HTTP 503 and succeeds on the second attempt", async () => {
    const mockFetch: FetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ result: "ok" }));
    vi.stubGlobal("fetch", mockFetch);

    const { call } = await loadClient();
    const result = await call<string>("crm.lead.add", {});

    expect(result).toBe("ok");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 15_000);

  it("throws BitrixError when BITRIX24_WEBHOOK_URL is not set", async () => {
    delete process.env.BITRIX24_WEBHOOK_URL;
    const mockFetch: FetchMock = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { call } = await loadClient();
    const { BitrixError } = await loadTypes();

    await expect(call("crm.lead.add", {})).rejects.toBeInstanceOf(BitrixError);
    await expect(call("crm.lead.add", {})).rejects.toMatchObject({
      code: "NO_WEBHOOK_URL",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("batch", () => {
  it("splits operations into chunks of 50 and issues 2 fetch calls for 51 operations", async () => {
    // `batch` calls `call` internally; `call` extracts `raw.result`. So the mock
    // returns { result: BitrixBatchResult } at the outer level.
    const emptyBatchResult = {
      result: {},
      result_error: {},
      result_total: {},
      result_next: {},
    };
    // Fresh Response per fetch call — bodies are single-use.
    const mockFetch: FetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ result: emptyBatchResult })),
      );
    vi.stubGlobal("fetch", mockFetch);

    const { batch } = await loadClient();

    const ops = Array.from({ length: 51 }, (_, i) => ({
      method: "crm.lead.get",
      params: { id: i + 1 },
    }));

    const merged = await batch(ops);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(merged).toEqual({
      result: {},
      result_error: {},
      result_total: {},
      result_next: {},
    });

    const firstUrl = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(firstUrl).toBe(
      "https://test.bitrix24.com/rest/1/testtoken/batch.json",
    );
  }, 15_000);
});
