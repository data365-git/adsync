import type { BitrixBatchResult, BatchOperation } from "./types";
import { BitrixError } from "./types";
import { withRetry } from "~/server/core/retry";
import { TokenRefreshError } from "~/integrations/google/oauth";
import { getPortalAuth } from "~/integrations/bitrix/oauth";

/** Optional target: a connected OAuth portal. Omit to use the legacy webhook. */
export type BitrixCallOpts = { portalId?: string };

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

class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpStatusError";
  }
}

async function fetchJson(
  url: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return withRetry(async () => {
    await rateLimit();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new HttpStatusError(res.status, `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as unknown;
  });
}

async function ensureBitrixTokenFresh(userId?: string): Promise<void> {
  if (!userId) return;

  const [{ db }, { ConnectionStatus, Provider }] = await Promise.all([
    import("~/server/db"),
    import("@prisma/client"),
  ]);
  const conn = await db.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: Provider.BITRIX24 } },
  });

  if (conn?.status !== ConnectionStatus.CONNECTED) {
    throw new TokenRefreshError("Bitrix");
  }

  if ((conn.expiresAt?.getTime() ?? Infinity) - Date.now() < 5 * 60 * 1000) {
    await db.oAuthConnection.update({
      where: { userId_provider: { userId, provider: Provider.BITRIX24 } },
      data: { status: ConnectionStatus.EXPIRED },
    });
    throw new TokenRefreshError("Bitrix");
  }
}

function getWebhookBase(): string {
  const url = process.env.BITRIX24_WEBHOOK_URL;
  if (!url)
    throw new BitrixError("NO_WEBHOOK_URL", "BITRIX24_WEBHOOK_URL is not set", "init");
  return url.replace(/\/$/, "");
}

/**
 * Resolve which Bitrix portal a call targets. With a `portalId`, use that
 * connected portal's OAuth token + REST base (refreshing as needed). Without
 * one, fall back to the single legacy webhook (BITRIX24_WEBHOOK_URL).
 */
async function resolveTarget(
  opts?: BitrixCallOpts,
): Promise<{ base: string; origin: string; auth: string | null }> {
  if (opts?.portalId) {
    const { accessToken, clientEndpoint } = await getPortalAuth(opts.portalId);
    const base = clientEndpoint.replace(/\/$/, "");
    let origin = "";
    try {
      origin = new URL(base).origin;
    } catch {
      origin = "";
    }
    return { base, origin, auth: accessToken };
  }
  const base = getWebhookBase();
  let origin = "";
  try {
    origin = new URL(base).origin;
  } catch {
    origin = "";
  }
  return { base, origin, auth: null };
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
  opts?: BitrixCallOpts,
): Promise<T> {
  const { base, auth } = await resolveTarget(opts);
  const query = auth ? `?auth=${encodeURIComponent(auth)}` : "";
  const url = `${base}/${method}.json${query}`;
  const raw = (await fetchJson(url, params)) as {
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
  userId?: string,
  opts?: BitrixCallOpts,
): Promise<{ leadId: string }> {
  // OAuth portal calls authenticate via getPortalAuth (inside call); only the
  // legacy webhook path needs the OAuthConnection freshness gate.
  if (!opts?.portalId) await ensureBitrixTokenFresh(userId);
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

  const id = await call<number>("crm.lead.add", { fields }, opts);
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
  userId?: string,
  opts?: BitrixCallOpts,
): Promise<{ leadId: string; updated: true }> {
  if (!opts?.portalId) await ensureBitrixTokenFresh(userId);
  const fields: Record<string, unknown> = {};
  if (input.title) fields.TITLE = input.title;
  if (input.statusId) fields.STATUS_ID = input.statusId;
  if (input.comments) fields.COMMENTS = input.comments;

  await call("crm.lead.update", { id: input.leadId, fields }, opts);
  return { leadId: input.leadId, updated: true };
}

export type DeleteLeadInput = {
  leadId: string;
};

export async function deleteLead(
  input: DeleteLeadInput,
  userId?: string,
  opts?: BitrixCallOpts,
): Promise<{ leadId: string; deleted: true }> {
  if (!opts?.portalId) await ensureBitrixTokenFresh(userId);
  await call("crm.lead.delete", { id: input.leadId }, opts);
  return { leadId: input.leadId, deleted: true };
}

export type CreateDealInput = {
  title: string;
  /** Pipeline (category) id. "0"/absent ⇒ the default General pipeline. */
  categoryId?: string;
  /** Stage within the pipeline, e.g. "C1:NEW" or "NEW". */
  stageId?: string;
  opportunity?: number;
  currency?: string;
  contactId?: string;
  comments?: string;
};

export async function createDeal(
  input: CreateDealInput,
  userId?: string,
  opts?: BitrixCallOpts,
): Promise<{ dealId: string }> {
  if (!opts?.portalId) await ensureBitrixTokenFresh(userId);
  const fields: Record<string, unknown> = { TITLE: input.title };
  if (input.categoryId !== undefined && input.categoryId !== "") {
    fields.CATEGORY_ID = input.categoryId;
  }
  if (input.stageId) fields.STAGE_ID = input.stageId;
  if (input.opportunity !== undefined) fields.OPPORTUNITY = input.opportunity;
  if (input.currency) fields.CURRENCY_ID = input.currency;
  if (input.contactId) fields.CONTACT_ID = input.contactId;
  if (input.comments) fields.COMMENTS = input.comments;

  const id = await call<number>("crm.deal.add", { fields }, opts);
  return { dealId: String(id) };
}
