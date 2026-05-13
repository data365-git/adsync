import "server-only";
import type { Lead, Deal, Contact, Prisma } from "@prisma/client";
import { db } from "~/server/db";
import { call } from "./client";
import { LEAD_MAPPING, DEAL_MAPPING, CONTACT_MAPPING } from "./field-mappings";
import type { FieldMapping } from "./field-mappings";
import type { BitrixDuplicateResult, SyncResult } from "./types";
import { BitrixError } from "./types";

function applyMapping(
  source: Record<string, unknown>,
  mapping: FieldMapping[],
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const { prismaField, bitrixField, transform } of mapping) {
    const val = source[prismaField];
    if (val === undefined || val === null || val === "") continue;
    const mapped = transform ? transform(val) : val;
    if (mapped !== undefined) fields[bitrixField] = mapped;
  }
  return fields;
}

async function findDuplicate(
  phone?: string | null,
  email?: string | null,
): Promise<BitrixDuplicateResult | null> {
  const values: string[] = [];
  if (phone) values.push(phone);
  if (email) values.push(email);
  if (values.length === 0) return null;

  const params: Record<string, unknown> = { type: "PHONE" };
  values.forEach((v, i) => {
    params[`values[${i}]`] = v;
  });

  try {
    return await call<BitrixDuplicateResult>("crm.duplicate.findbycomm", params);
  } catch {
    // dedup failure is non-fatal — we fall through to add
    return null;
  }
}

async function writeSyncLog(opts: {
  jobId: string;
  entity: string;
  bitrixId: string | null;
  success: boolean;
  request: Record<string, unknown>;
  response: unknown;
  error?: string;
  duration: number;
}): Promise<void> {
  await db.syncLog.create({
    data: {
      jobId: opts.jobId,
      entity: opts.entity,
      bitrixId: opts.bitrixId,
      direction: "to_bitrix",
      success: opts.success,
      request: opts.request as unknown as Prisma.InputJsonValue,
      response: opts.response as Prisma.InputJsonValue,
      error: opts.error ?? null,
      duration: opts.duration,
    },
  });
}

/**
 * Sync a Lead record to Bitrix24. Idempotent:
 * - If bitrixId already set → update in place
 * - If no bitrixId → dedup via findbycomm → update or create
 */
export async function syncLead(lead: Lead, jobId: string): Promise<SyncResult> {
  const start = Date.now();
  const fields = applyMapping(lead, LEAD_MAPPING);

  if (lead.bitrixId) {
    const req = { id: lead.bitrixId, fields };
    try {
      await call("crm.lead.update", req);
    } catch (err) {
      const msg = err instanceof BitrixError ? err.message : String(err);
      await writeSyncLog({ jobId, entity: "Lead", bitrixId: lead.bitrixId, success: false, request: req, response: {}, error: msg, duration: Date.now() - start });
      throw err;
    }
    const duration = Date.now() - start;
    await writeSyncLog({ jobId, entity: "Lead", bitrixId: lead.bitrixId, success: true, request: req, response: {}, duration });
    await db.lead.update({ where: { id: lead.id }, data: { lastSyncedAt: new Date() } });
    return { bitrixId: lead.bitrixId, operation: "updated", durationMs: duration };
  }

  const dupe = await findDuplicate(lead.phone, lead.email);
  const existingId = dupe?.LEAD?.[0] ?? null;

  let bitrixId: string;
  let operation: "created" | "updated";

  try {
    if (existingId) {
      await call("crm.lead.update", { id: existingId, fields });
      bitrixId = existingId;
      operation = "updated";
    } else {
      bitrixId = String(await call<number>("crm.lead.add", { fields }));
      operation = "created";
    }
  } catch (err) {
    const msg = err instanceof BitrixError ? err.message : String(err);
    await writeSyncLog({ jobId, entity: "Lead", bitrixId: existingId, success: false, request: { fields }, response: {}, error: msg, duration: Date.now() - start });
    throw err;
  }

  const duration = Date.now() - start;
  await writeSyncLog({ jobId, entity: "Lead", bitrixId, success: true, request: { fields }, response: { id: bitrixId }, duration });
  await db.lead.update({ where: { id: lead.id }, data: { bitrixId, lastSyncedAt: new Date() } });
  return { bitrixId, operation, durationMs: duration };
}

/**
 * Sync a Deal to Bitrix24. Idempotent (update if bitrixId set, else create).
 * Deals have no built-in dedup — identity comes from the existing bitrixId.
 */
export async function syncDeal(deal: Deal, jobId: string): Promise<SyncResult> {
  const start = Date.now();
  const fields = applyMapping(deal, DEAL_MAPPING);

  if (deal.bitrixId) {
    const req = { id: deal.bitrixId, fields };
    try {
      await call("crm.deal.update", req);
    } catch (err) {
      const msg = err instanceof BitrixError ? err.message : String(err);
      await writeSyncLog({ jobId, entity: "Deal", bitrixId: deal.bitrixId, success: false, request: req, response: {}, error: msg, duration: Date.now() - start });
      throw err;
    }
    const duration = Date.now() - start;
    await writeSyncLog({ jobId, entity: "Deal", bitrixId: deal.bitrixId, success: true, request: req, response: {}, duration });
    await db.deal.update({ where: { id: deal.id }, data: { lastSyncedAt: new Date() } });
    return { bitrixId: deal.bitrixId, operation: "updated", durationMs: duration };
  }

  let bitrixId: string;
  try {
    bitrixId = String(await call<number>("crm.deal.add", { fields }));
  } catch (err) {
    const msg = err instanceof BitrixError ? err.message : String(err);
    await writeSyncLog({ jobId, entity: "Deal", bitrixId: null, success: false, request: { fields }, response: {}, error: msg, duration: Date.now() - start });
    throw err;
  }

  const duration = Date.now() - start;
  await writeSyncLog({ jobId, entity: "Deal", bitrixId, success: true, request: { fields }, response: { id: bitrixId }, duration });
  await db.deal.update({ where: { id: deal.id }, data: { bitrixId, lastSyncedAt: new Date() } });
  return { bitrixId, operation: "created", durationMs: duration };
}

/**
 * Sync a Contact to Bitrix24. Idempotent:
 * - If bitrixId already set → update in place
 * - If no bitrixId → dedup via findbycomm → update or create
 */
export async function syncContact(contact: Contact, jobId: string): Promise<SyncResult> {
  const start = Date.now();
  const fields = applyMapping(contact, CONTACT_MAPPING);

  if (contact.bitrixId) {
    const req = { id: contact.bitrixId, fields };
    try {
      await call("crm.contact.update", req);
    } catch (err) {
      const msg = err instanceof BitrixError ? err.message : String(err);
      await writeSyncLog({ jobId, entity: "Contact", bitrixId: contact.bitrixId, success: false, request: req, response: {}, error: msg, duration: Date.now() - start });
      throw err;
    }
    const duration = Date.now() - start;
    await writeSyncLog({ jobId, entity: "Contact", bitrixId: contact.bitrixId, success: true, request: req, response: {}, duration });
    await db.contact.update({ where: { id: contact.id }, data: { lastSyncedAt: new Date() } });
    return { bitrixId: contact.bitrixId, operation: "updated", durationMs: duration };
  }

  const dupe = await findDuplicate(contact.phone, contact.email);
  const existingId = dupe?.CONTACT?.[0] ?? null;

  let bitrixId: string;
  let operation: "created" | "updated";

  try {
    if (existingId) {
      await call("crm.contact.update", { id: existingId, fields });
      bitrixId = existingId;
      operation = "updated";
    } else {
      bitrixId = String(await call<number>("crm.contact.add", { fields }));
      operation = "created";
    }
  } catch (err) {
    const msg = err instanceof BitrixError ? err.message : String(err);
    await writeSyncLog({ jobId, entity: "Contact", bitrixId: existingId, success: false, request: { fields }, response: {}, error: msg, duration: Date.now() - start });
    throw err;
  }

  const duration = Date.now() - start;
  await writeSyncLog({ jobId, entity: "Contact", bitrixId, success: true, request: { fields }, response: { id: bitrixId }, duration });
  await db.contact.update({ where: { id: contact.id }, data: { bitrixId, lastSyncedAt: new Date() } });
  return { bitrixId, operation, durationMs: duration };
}
