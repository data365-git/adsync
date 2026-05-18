import "server-only";
import type { BitrixBatchResult, BatchOperation } from "./types";
import { BitrixError } from "./types";

// 2 req/sec max → enforce 500ms minimum gap between calls
const MIN_INTERVAL_MS = 500;
let lastCallAt = 0;

async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise<void>((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastCallAt = Date.now();
}

async function fetchWithRetry(
  url: string,
  body: Record<string, unknown>,
  attempt = 0,
): Promise<unknown> {
  try {
    await rateLimit();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 503 || res.status === 429) {
      if (attempt >= 4) throw new Error(`HTTP ${res.status} after ${attempt + 1} attempts`);
      await new Promise<void>((r) =>
        setTimeout(r, Math.min(1_000 * 2 ** attempt, 30_000)),
      );
      return fetchWithRetry(url, body, attempt + 1);
    }
    return res.json() as unknown;
  } catch (err) {
    if (attempt >= 4) throw err;
    await new Promise<void>((r) =>
      setTimeout(r, Math.min(1_000 * 2 ** attempt, 30_000)),
    );
    return fetchWithRetry(url, body, attempt + 1);
  }
}

function getWebhookBase(): string {
  const url = process.env.BITRIX24_WEBHOOK_URL;
  if (!url)
    throw new BitrixError("NO_WEBHOOK_URL", "BITRIX24_WEBHOOK_URL is not set", "init");
  return url.replace(/\/$/, "");
}

/**
 * Build a deep link to a Bitrix24 lead detail page from the configured webhook URL.
 * Returns null if BITRIX24_WEBHOOK_URL isn't set or doesn't parse — callers can
 * still surface the leadId without the link.
 */
export function getLeadUrl(leadId: string): string | null {
  const raw = process.env.BITRIX24_WEBHOOK_URL;
  if (!raw) return null;
  try {
    return `${new URL(raw).origin}/crm/lead/details/${leadId}/`;
  } catch {
    return null;
  }
}

/**
 * Call a single Bitrix24 REST method and return the typed result.
 * Throws BitrixError on API-level errors; retries on 503/network failures.
 */
export async function call<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = `${getWebhookBase()}/${method}.json`;
  const raw = (await fetchWithRetry(url, params)) as {
    result?: T;
    error?: string;
    error_description?: string;
  };
  if (raw.error) {
    throw new BitrixError(raw.error, raw.error_description ?? "", method);
  }
  return raw.result as T;
}

/**
 * Execute up to 50 Bitrix24 methods per HTTP request via the batch endpoint.
 * Automatically splits larger arrays into 50-op chunks and merges results.
 */
export async function batch(
  operations: BatchOperation[],
): Promise<BitrixBatchResult> {
  const merged: BitrixBatchResult = {
    result: {},
    result_error: {},
    result_total: {},
    result_next: {},
  };

  for (let i = 0; i < operations.length; i += 50) {
    const chunk = operations.slice(i, i + 50);
    const cmd: Record<string, string> = {};
    chunk.forEach((op, idx) => {
      const qs = toQueryString(op.params);
      cmd[`op${i + idx}`] = qs ? `${op.method}?${qs}` : op.method;
    });

    const data = await call<BitrixBatchResult>("batch", { halt: 0, cmd });
    Object.assign(merged.result, data.result);
    Object.assign(merged.result_error, data.result_error);
    Object.assign(merged.result_total, data.result_total);
    Object.assign(merged.result_next, data.result_next);
  }

  return merged;
}

function toQueryString(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix
      ? `${prefix}[${encodeURIComponent(k)}]`
      : encodeURIComponent(k);
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          const nested = toQueryString(
            item as Record<string, unknown>,
            `${key}[${i}]`,
          );
          if (nested) parts.push(nested);
        } else {
          parts.push(`${key}[${i}]=${encodeURIComponent(String(item ?? ""))}`);
        }
      });
    } else if (v !== null && typeof v === "object") {
      const nested = toQueryString(v as Record<string, unknown>, key);
      if (nested) parts.push(nested);
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      parts.push(`${key}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.join("&");
}

export type CreateLeadInput = {
  title: string;
  name: string;
  lastName?: string;
  phone?: string;
  email?: string;
  sourceId: string;
  comments?: string;
};

export async function createLead(
  input: CreateLeadInput,
): Promise<{ leadId: string }> {
  const fields: Record<string, unknown> = {
    TITLE: input.title,
    NAME: input.name,
    SOURCE_ID: input.sourceId,
  };
  if (input.lastName) fields.LAST_NAME = input.lastName;
  if (input.phone) {
    fields.PHONE = [{ VALUE: input.phone, VALUE_TYPE: "WORK" }];
  }
  if (input.email) {
    fields.EMAIL = [{ VALUE: input.email, VALUE_TYPE: "WORK" }];
  }
  if (input.comments) fields.COMMENTS = input.comments;

  const id = await call<number>("crm.lead.add", { fields });
  return { leadId: String(id) };
}

export type UpdateLeadInput = {
  leadId: string;
  title?: string;
  statusId?: string;
  comments?: string;
};

export async function updateLead(
  input: UpdateLeadInput,
): Promise<{ leadId: string; updated: true }> {
  const fields: Record<string, unknown> = {};
  if (input.title) fields.TITLE = input.title;
  if (input.statusId) fields.STATUS_ID = input.statusId;
  if (input.comments) fields.COMMENTS = input.comments;

  await call("crm.lead.update", { id: input.leadId, fields });
  return { leadId: input.leadId, updated: true };
}
