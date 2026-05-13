import "server-only";
import { db } from "~/server/db";
import { getRows } from "./client";

export type EntityType = "Lead" | "Deal" | "Contact";

interface PollConfig {
  sheetId: string;
  tabName: string;
  entity: EntityType;
}

interface PollResult {
  polled: number;
  changed: number;
  jobsCreated: number;
}

function rowToMap(headers: string[], row: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((h, i) => {
    map[h.toLowerCase().trim()] = row[i] ?? "";
  });
  return map;
}

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => !cell.trim());
}

async function upsertLead(
  sourceRowId: string,
  data: Record<string, string>,
  rawRow: string[],
): Promise<{ changed: boolean; entityId: string }> {
  const rawJson = rawRow as unknown as object;
  const existing = await db.lead.findUnique({ where: { sourceRowId } });
  if (existing && JSON.stringify(existing.raw) === JSON.stringify(rawRow)) {
    return { changed: false, entityId: existing.id };
  }
  const fields = {
    name: data.name ?? data.title ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    status: data.status ?? null,
    source: data.source ?? null,
    raw: rawJson,
  };
  const record = await db.lead.upsert({
    where: { sourceRowId },
    create: { sourceRowId, ...fields },
    update: fields,
  });
  return { changed: true, entityId: record.id };
}

async function upsertDeal(
  sourceRowId: string,
  data: Record<string, string>,
  rawRow: string[],
): Promise<{ changed: boolean; entityId: string }> {
  const rawJson = rawRow as unknown as object;
  const existing = await db.deal.findUnique({ where: { sourceRowId } });
  if (existing && JSON.stringify(existing.raw) === JSON.stringify(rawRow)) {
    return { changed: false, entityId: existing.id };
  }
  const fields = {
    title: data.title ?? data.name ?? null,
    contactId: data.contactid ?? data.contact_id ?? null,
    stageId: data.stageid ?? data.stage_id ?? data.stage ?? null,
    amount: data.amount ?? data.opportunity ?? null,
    currency: data.currency ?? null,
    raw: rawJson,
  };
  const record = await db.deal.upsert({
    where: { sourceRowId },
    create: { sourceRowId, ...fields },
    update: fields,
  });
  return { changed: true, entityId: record.id };
}

async function upsertContact(
  sourceRowId: string,
  data: Record<string, string>,
  rawRow: string[],
): Promise<{ changed: boolean; entityId: string }> {
  const rawJson = rawRow as unknown as object;
  const existing = await db.contact.findUnique({ where: { sourceRowId } });
  if (existing && JSON.stringify(existing.raw) === JSON.stringify(rawRow)) {
    return { changed: false, entityId: existing.id };
  }
  const fields = {
    name: data.name ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    source: data.source ?? null,
    raw: rawJson,
  };
  const record = await db.contact.upsert({
    where: { sourceRowId },
    create: { sourceRowId, ...fields },
    update: fields,
  });
  return { changed: true, entityId: record.id };
}

/**
 * Poll a single Sheet tab for an entity type.
 * Upserts changed rows to Postgres and enqueues SyncJob rows.
 *
 * @param config - Sheet ID, tab name, and entity type
 * @returns Counts of polled rows, changed rows, and jobs created
 */
export async function pollEntity(config: PollConfig): Promise<PollResult> {
  const rows = await getRows(config.sheetId, config.tabName);
  if (rows.length < 2) return { polled: 0, changed: 0, jobsCreated: 0 };

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return { polled: 0, changed: 0, jobsCreated: 0 };

  let polled = 0;
  let changed = 0;
  let jobsCreated = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i]!;
    if (isEmptyRow(rawRow)) continue;

    const sourceRowId = `${config.entity.toLowerCase()}:row:${i + 2}`;
    const data = rowToMap(headerRow, rawRow);
    polled++;

    let result: { changed: boolean; entityId: string };
    if (config.entity === "Lead") {
      result = await upsertLead(sourceRowId, data, rawRow);
    } else if (config.entity === "Deal") {
      result = await upsertDeal(sourceRowId, data, rawRow);
    } else {
      result = await upsertContact(sourceRowId, data, rawRow);
    }

    if (result.changed) {
      changed++;
      await db.syncJob.create({
        data: {
          entity: config.entity,
          entityId: result.entityId,
          operation: "upsert",
          payload: data,
          status: "pending",
        },
      });
      jobsCreated++;
    }
  }

  return { polled, changed, jobsCreated };
}

/**
 * Poll all three entity tabs (Leads, Deals, Contacts).
 * Logs errors per entity but does not throw — partial failures are acceptable.
 */
export async function pollAll(): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_ID ?? "";
  if (!sheetId) {
    console.error("[sheets] GOOGLE_SHEETS_ID is not set — skipping poll");
    return;
  }

  const configs: PollConfig[] = [
    {
      sheetId,
      tabName: process.env.GOOGLE_SHEETS_TAB_LEADS ?? "Leads",
      entity: "Lead",
    },
    {
      sheetId,
      tabName: process.env.GOOGLE_SHEETS_TAB_DEALS ?? "Deals",
      entity: "Deal",
    },
    {
      sheetId,
      tabName: process.env.GOOGLE_SHEETS_TAB_CONTACTS ?? "Contacts",
      entity: "Contact",
    },
  ];

  for (const config of configs) {
    try {
      const result = await pollEntity(config);
      console.warn(
        `[sheets] ${config.entity}: polled=${result.polled} changed=${result.changed} jobs=${result.jobsCreated}`,
      );
    } catch (err) {
      console.error(`[sheets] Failed to poll ${config.entity}:`, err);
    }
  }
}
