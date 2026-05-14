/**
 * Module handler registry.
 *
 * Each handler receives:
 *   - step: the ScenarioStep row from DB
 *   - ctx: the RunContext for inter-step data sharing
 *   - userId: the owner of the run (used to look up OAuth tokens)
 *
 * Returns: an object with at minimum `{ rowCount: number }`. Sheets handlers
 * also return `{ sheetsUrl: string }`.
 *
 * NOTE: imports from ~/integrations/facebook/graph-client and
 * ~/integrations/google/sheets-client are provided by Agents B/C. These
 * imports will fail typecheck in this worktree until the branches are merged.
 * Merge-time resolver: agents B and C add those files on their branches;
 * after merge, these imports resolve correctly.
 */

import type { ScenarioStep } from "@prisma/client";
import type { RunContext } from "./run-context";

// ── Integration imports ───────────────────────────────────────────────────────
// Stubs live in this worktree; real implementations merged from Agents B and C.
import {
  getAccountInsights,
  getCampaignInsights,
  getAdInsights,
  listAdAccounts,
} from "~/integrations/facebook/graph-client";

import {
  appendRows,
  findRows,
  updateRow,
  upsertRows,
} from "~/integrations/google/sheets-client";
// ─────────────────────────────────────────────────────────────────────────────

export type HandlerResult = {
  rowCount: number;
  rows?: unknown[];
  sheetsUrl?: string;
};

export type Handler = (
  step: ScenarioStep,
  ctx: RunContext,
  userId: string,
) => Promise<HandlerResult>;

/** One allowed cast at the config boundary — Prisma stores config as Json. */
function cfg<T>(step: ScenarioStep): T {
  return step.config as T;
}

// ── Trigger handlers ─────────────────────────────────────────────────────────
// All triggers in Phase 1 are no-ops at execution time. The real "watch"
// triggers (Phase 4) fire from polling/webhook sidecars that ENQUEUE runs
// here — by the time the executor sees the step, the trigger has already
// fired externally and we just need to pass control to the action steps.

const triggerScheduleHandler: Handler = async (_step, _ctx, _userId) => {
  return { rowCount: 0 };
};

const triggerManualHandler: Handler = async (_step, _ctx, _userId) => {
  return { rowCount: 0 };
};

const triggerWebhookHandler: Handler = async (_step, _ctx, _userId) => {
  return { rowCount: 0 };
};

const triggerWatchHandler: Handler = async (_step, _ctx, _userId) => {
  // Both trigger.watch.sheets_new_rows and trigger.watch.bitrix_new_lead
  // share this handler — the watch infrastructure (polling, dedup) lives
  // outside the executor; runs that reach here have already been triggered.
  return { rowCount: 0 };
};

/**
 * Handler for module types that exist in the catalog
 * but have not been implemented yet. Throws loudly so runs FAIL — never silent green.
 */
export const notImplementedHandler: Handler = async (step, _ctx, _userId) => {
  throw new Error(`MODULE_NOT_IMPLEMENTED: ${step.moduleType}`);
};

// ── Facebook handlers ─────────────────────────────────────────────────────────

type FbInsightsCfg = {
  fbAccountId: string;
  metrics: string[];
  dateWindowDays: number;
};

const fbAccountInsightsHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<FbInsightsCfg>(step);
  const rows: unknown[] = await getAccountInsights(userId, {
    fbAccountId: config.fbAccountId,
    level: "account" as const,
    metrics: config.metrics,
    dateWindowDays: config.dateWindowDays,
  });
  ctx.setOutput(step.position, rows);
  return { rowCount: rows.length, rows };
};

const fbCampaignInsightsHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<FbInsightsCfg>(step);
  const rows: unknown[] = await getCampaignInsights(userId, {
    fbAccountId: config.fbAccountId,
    level: "campaign" as const,
    metrics: config.metrics,
    dateWindowDays: config.dateWindowDays,
  });
  ctx.setOutput(step.position, rows);
  return { rowCount: rows.length, rows };
};

const fbAdInsightsHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<FbInsightsCfg>(step);
  const rows: unknown[] = await getAdInsights(userId, {
    fbAccountId: config.fbAccountId,
    level: "ad" as const,
    metrics: config.metrics,
    dateWindowDays: config.dateWindowDays,
  });
  ctx.setOutput(step.position, rows);
  return { rowCount: rows.length, rows };
};

const fbListAdAccountsHandler: Handler = async (step, ctx, userId) => {
  const rows = await listAdAccounts(userId);
  ctx.setOutput(step.position, rows);
  return { rowCount: rows.length, rows };
};

// ── Google Sheets handlers ────────────────────────────────────────────────────

type SheetsCfg = {
  spreadsheetId: string;
  tabName: string;
  mappedFields?: string[];
};

type SheetsUpsertCfg = SheetsCfg & {
  keyFields: string[];
};

type SheetsFindRowsCfg = {
  spreadsheetId: string;
  tabName: string;
  searchColumn: string;
  searchValue: string;
};

type SheetsUpdateRowCfg = {
  spreadsheetId: string;
  tabName: string;
  rowIdentifier: string;
  mappedFields: Record<string, string>;
};

type BitrixCreateLeadCfg = {
  title: string;
  name: string;
  lastName?: string;
  phone?: string;
  email?: string;
  sourceId: string;
  comments?: string;
};

type BitrixUpdateLeadCfg = {
  leadId: string;
  title?: string;
  statusId?: string;
  comments?: string;
};

function projectRows(
  rows: unknown[],
  mappedFields?: string[],
): Record<string, unknown>[] {
  const objectRows: Record<string, unknown>[] = rows.flatMap((row) =>
    typeof row === "object" && row !== null
      ? [row as Record<string, unknown>]
      : [],
  );
  if (!mappedFields || mappedFields.length === 0) return objectRows;
  return objectRows.map((row) => {
    const projected: Record<string, unknown> = {};
    for (const field of mappedFields) {
      projected[field] = row[field];
    }
    return projected;
  });
}

const sheetsAppendHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsCfg>(step);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (upstreamRows.length === 0) {
    return {
      rowCount: 0,
      sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    };
  }
  const rows = projectRows(upstreamRows, config.mappedFields);
  await appendRows(userId, config.spreadsheetId, config.tabName, rows);
  return {
    rowCount: rows.length,
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
  };
};

const sheetsUpsertHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsUpsertCfg>(step);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (upstreamRows.length === 0) {
    return {
      rowCount: 0,
      sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    };
  }
  const rows = projectRows(upstreamRows, config.mappedFields);
  await upsertRows(
    userId,
    config.spreadsheetId,
    config.tabName,
    config.keyFields ?? [],
    rows,
  );
  return {
    rowCount: rows.length,
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
  };
};

const sheetsFindRowsHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsFindRowsCfg>(step);
  const rows = await findRows(
    userId,
    config.spreadsheetId,
    config.tabName,
    config.searchColumn,
    config.searchValue,
  );
  ctx.setOutput(step.position, rows);
  return {
    rowCount: rows.length,
    rows,
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
  };
};

const sheetsUpdateRowHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsUpdateRowCfg>(step);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (upstreamRows.length === 0) {
    return {
      rowCount: 0,
      rows: [],
      sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    };
  }

  const projected = projectRows(upstreamRows, Object.keys(config.mappedFields));
  const firstRow = projected[0] ?? {};

  const { row, updatedFields } = await updateRow(
    userId,
    config.spreadsheetId,
    config.tabName,
    config.rowIdentifier,
    firstRow,
  );

  const outputRow = { row, status: "updated" as const, updatedFields };
  ctx.setOutput(step.position, [outputRow]);
  return {
    rowCount: 1,
    rows: [outputRow],
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
  };
};

const bitrixCreateLeadHandler: Handler = async (step, ctx, _userId) => {
  const { createLead } = await import("~/server/bitrix24/client");
  const config = cfg<BitrixCreateLeadCfg>(step);
  const result = await createLead({
    title: config.title,
    name: config.name,
    lastName: config.lastName,
    phone: config.phone,
    email: config.email,
    sourceId: config.sourceId,
    comments: config.comments,
  });
  const outputRow = {
    leadId: result.leadId,
    createdAt: new Date().toISOString(),
  };
  ctx.setOutput(step.position, [outputRow]);
  return { rowCount: 1, rows: [outputRow] };
};

const bitrixUpdateLeadHandler: Handler = async (step, ctx, _userId) => {
  const { updateLead } = await import("~/server/bitrix24/client");
  const config = cfg<BitrixUpdateLeadCfg>(step);
  const result = await updateLead({
    leadId: config.leadId,
    title: config.title,
    statusId: config.statusId,
    comments: config.comments,
  });
  const outputRow = { leadId: result.leadId, updated: result.updated };
  ctx.setOutput(step.position, [outputRow]);
  return { rowCount: 1, rows: [outputRow] };
};

// ── Registry ──────────────────────────────────────────────────────────────────

const HANDLERS: Record<string, Handler> = {
  // Triggers
  "trigger.schedule": triggerScheduleHandler,
  "trigger.manual": triggerManualHandler,
  "trigger.webhook": triggerWebhookHandler,
  "trigger.watch.sheets_new_rows": triggerWatchHandler,
  "trigger.watch.bitrix_new_lead": triggerWatchHandler,

  // Facebook
  "fb.account_insights": fbAccountInsightsHandler,
  "fb.campaign_insights": fbCampaignInsightsHandler,
  "fb.ad_insights": fbAdInsightsHandler,
  "fb.list_ad_accounts": fbListAdAccountsHandler,
  "fb.list_ads": notImplementedHandler,
  "fb.get_ad": notImplementedHandler,

  // Google Sheets
  "sheets.append": sheetsAppendHandler,
  "sheets.upsert": sheetsUpsertHandler,
  "sheets.find_rows": sheetsFindRowsHandler,
  "sheets.update_row": sheetsUpdateRowHandler,
  "sheets.delete_row": notImplementedHandler,
  "sheets.get_row": notImplementedHandler,
  "sheets.create_tab": notImplementedHandler,
  "sheets.watch_new_rows": notImplementedHandler,

  // Bitrix24
  "bitrix.create_lead": bitrixCreateLeadHandler,
  "bitrix.update_lead": bitrixUpdateLeadHandler,
  "bitrix.find_leads": notImplementedHandler,
  "bitrix.create_deal": notImplementedHandler,
  "bitrix.update_deal": notImplementedHandler,
};

export function getHandler(moduleType: string): Handler {
  const handler = HANDLERS[moduleType];
  if (!handler) {
    throw new Error(`No handler registered for module type: ${moduleType}`);
  }
  return handler;
}
