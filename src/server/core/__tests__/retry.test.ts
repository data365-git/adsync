import { describe, expect, it, vi } from "vitest";

import { withRetry } from "../retry";

describe("withRetry", () => {
  it("succeeds on the first try without retries", async () => {
    const fn = vi.fn(async () => "ok");

    await expect(withRetry(fn, { baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on ECONNRESET and succeeds on the second attempt", async () => {
    const error = Object.assign(new Error("reset"), { code: "ECONNRESET" });
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce("ok");

    await expect(withRetry(fn, { baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 attempts and throws the underlying error", async () => {
    const error = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    const fn = vi.fn(async () => {
      throw error;
    });

    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400-class HTTP errors", async () => {
    const error = Object.assign(new Error("bad request"), { status: 400 });
    const fn = vi.fn(async () => {
      throw error;
    });

    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
