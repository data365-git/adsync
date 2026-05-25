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
import { interpolateWithWarnings } from "./template";

// ── Integration imports ───────────────────────────────────────────────────────
import {
  appendRows,
  findRows,
  PartialWriteError,
  readTabRows,
  updateRow,
  upsertRows,
} from "~/integrations/google/sheets-client";
// ─────────────────────────────────────────────────────────────────────────────

export type HandlerResult = {
  rowCount: number;
  rows?: unknown[];
  sheetsUrl?: string;
  message?: string;
  warnings?: string[];
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

const triggerWebhookHandler: Handler = async (step, ctx, _userId) => {
  const seeded = ctx.getOutput(step.position);
  if (seeded.length > 0) {
    return { rowCount: seeded.length, rows: seeded };
  }

  const sample = [
    {
      _source: "webhook_sample",
      event: "test",
      timestamp: new Date().toISOString(),
    },
  ];
  ctx.setOutput(step.position, sample);
  return { rowCount: sample.length, rows: sample };
};

const triggerWatchHandler: Handler = async (_step, _ctx, _userId) => {
  // Bitrix watch trigger: real polling lives outside the executor; on manual
  // test runs there's no pre-buffered row, so we just pass through.
  return { rowCount: 0 };
};

type SheetsWatchCfg = {
  spreadsheetId: string;
  tabName: string;
  watchColumn?: string;
};

// On manual / test runs the worker poller hasn't pre-buffered a row, so we
// read the configured tab live and emit the most recent data row downstream.
// Semantics match outputsArray:false in the module catalog (one row per fire).
const triggerWatchSheetsNewRowsHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsWatchCfg>(step);
  const rows = await readTabRows(userId, config.spreadsheetId, config.tabName);
  if (rows.length === 0) {
    ctx.setOutput(step.position, []);
    return { rowCount: 0, rows: [] };
  }
  const latest = rows[rows.length - 1]!;
  ctx.setOutput(step.position, [latest]);
  return { rowCount: 1, rows: [latest] };
};

/**
 * Handler for module types that exist in the catalog
 * but have not been implemented yet. Throws loudly so runs FAIL — never silent green.
 */
export const notImplementedHandler: Handler = async (step, _ctx, _userId) => {
  throw new Error(`MODULE_NOT_IMPLEMENTED: ${step.moduleType}`);
};

// ── Google Sheets handlers ────────────────────────────────────────────────────

type SheetsCfg = {
  spreadsheetId: string;
  tabName: string;
  /**
   * column → value expression; empty string = copy upstream row's column value.
   * Legacy configs may store a plain string[] — normalized at handler entry via
   * normalizeMappedFields().
   */
  mappedFields?: Record<string, string> | string[];
};

type SheetsUpsertCfg = SheetsCfg & {
  keyFields: string[];
};

type SheetsFindRowsCfg = {
  spreadsheetId: string;
  tabName: string;
  searchColumn?: string;
  searchValue?: string;
  filterColumn?: string;
  filterValue?: string;
  limit?: number;
};

type SheetsUpdateRowCfg = {
  spreadsheetId: string;
  tabName: string;
  rowIdentifier: string;
  /**
   * column → value expression; empty string = copy upstream row's column value.
   * Legacy configs may store a plain string[] — normalized at handler entry via
   * normalizeMappedFields().
   */
  mappedFields: Record<string, string> | string[];
};

/**
 * Coerce a legacy `mappedFields` value that was saved as a plain string array
 * (e.g. `["name", "email"]`) into the new Record shape (`{ name: "", email: "" }`).
 * Configs saved after this release already use the Record shape and pass through
 * unchanged. The coercion is idempotent so it is safe to call on every handler
 * entry.
 */
function normalizeMappedFields(
  raw: Record<string, string> | string[] | undefined,
): Record<string, string> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const result: Record<string, string> = {};
    for (const field of raw) {
      result[field] = "";
    }
    return result;
  }
  return raw;
}

/**
 * Build a single output row from an upstream row and a column→value-expression
 * mapping.
 *
 * For each (columnKey, valueExpr) pair:
 * - If valueExpr is non-empty, it is interpolated against the upstream row
 *   using `interpolate()` — supports `{{token}}` style placeholders and literal
 *   strings.
 * - If valueExpr is empty, the upstream row's own value for that column is used
 *   as-is (backwards-compat: zero-config sheet copies still work).
 */
export function buildRowFromMapping(
  upstreamRow: Record<string, unknown>,
  mappedFields: Record<string, string>,
): Record<string, unknown> {
  return buildRowFromMappingWithWarnings(upstreamRow, mappedFields).row;
}

export function buildRowFromMappingWithWarnings(
  upstreamRow: Record<string, unknown>,
  mappedFields: Record<string, string>,
): { row: Record<string, unknown>; warnings: string[] } {
  const result: Record<string, unknown> = {};
  const warnings: string[] = [];
  for (const [col, expr] of Object.entries(mappedFields)) {
    if (expr !== "") {
      const interpolated = interpolateWithWarnings(expr, upstreamRow);
      result[col] = interpolated.value;
      warnings.push(...interpolated.warnings);
    } else {
      result[col] = upstreamRow[col];
    }
  }
  return { row: result, warnings: Array.from(new Set(warnings)) };
}

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

const sheetsAppendHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsCfg>(step);
  const mapping = normalizeMappedFields(config.mappedFields);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (upstreamRows.length === 0) {
    return {
      rowCount: 0,
      sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
      message: "0 upstream rows; skipped",
    };
  }
  const warnings: string[] = [];
  const rows = upstreamRows.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const built = buildRowFromMappingWithWarnings(
      row as Record<string, unknown>,
      mapping,
    );
    warnings.push(...built.warnings);
    return [built.row];
  });
  try {
    await appendRows(userId, config.spreadsheetId, config.tabName, rows);
  } catch (error) {
    if (error instanceof PartialWriteError) {
      throw new Error(
        `Partial write: ${error.rowsCommitted} of ${error.rowsAttempted} rows committed before error: ${error.message}`,
      );
    }
    throw error;
  }
  return {
    rowCount: rows.length,
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    warnings: Array.from(new Set(warnings)),
  };
};

const sheetsUpsertHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsUpsertCfg>(step);
  const mapping = normalizeMappedFields(config.mappedFields);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (upstreamRows.length === 0) {
    return {
      rowCount: 0,
      sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
      message: "0 upstream rows; skipped",
    };
  }
  const warnings: string[] = [];
  const rows = upstreamRows.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const built = buildRowFromMappingWithWarnings(
      row as Record<string, unknown>,
      mapping,
    );
    warnings.push(...built.warnings);
    return [built.row];
  });
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
    warnings: Array.from(new Set(warnings)),
  };
};

const sheetsFindRowsHandler: Handler = async (step, ctx, userId) => {
  const config = cfg<SheetsFindRowsCfg>(step);
  const rows = await findRows(
    userId,
    config.spreadsheetId,
    config.tabName,
    config.searchColumn ?? config.filterColumn,
    config.searchValue ?? config.filterValue,
    config.limit,
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
  const mapping = normalizeMappedFields(config.mappedFields);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (upstreamRows.length === 0) {
    return {
      rowCount: 0,
      rows: [],
      sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
      message: "0 upstream rows; skipped",
    };
  }

  const firstUpstream =
    typeof upstreamRows[0] === "object" && upstreamRows[0] !== null
      ? (upstreamRows[0] as Record<string, unknown>)
      : {};
  const built = buildRowFromMappingWithWarnings(firstUpstream, mapping);

  const { row, updatedFields } = await updateRow(
    userId,
    config.spreadsheetId,
    config.tabName,
    config.rowIdentifier,
    built.row,
  );

  const outputRow = { row, status: "updated" as const, updatedFields };
  ctx.setOutput(step.position, [outputRow]);
  return {
    rowCount: 1,
    rows: [outputRow],
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    warnings: built.warnings,
  };
};

const bitrixCreateLeadHandler: Handler = async (step, ctx, userId) => {
  const { createLead, getLeadUrl } = await import("~/server/bitrix24/client");
  const config = cfg<BitrixCreateLeadCfg>(step);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (ctx.outputs?.has(step.position - 1) && upstreamRows.length === 0) {
    return { rowCount: 0, rows: [], message: "0 upstream rows; skipped" };
  }
  const result = await createLead(
    {
      title: config.title,
      name: config.name,
      lastName: config.lastName,
      phone: config.phone,
      email: config.email,
      sourceId: config.sourceId,
      comments: config.comments,
    },
    userId,
  );
  const outputRow = {
    leadId: result.leadId,
    leadUrl: getLeadUrl(result.leadId),
    createdAt: new Date().toISOString(),
  };
  ctx.setOutput(step.position, [outputRow]);
  return { rowCount: 1, rows: [outputRow] };
};

const bitrixUpdateLeadHandler: Handler = async (step, ctx, userId) => {
  const { updateLead } = await import("~/server/bitrix24/client");
  const config = cfg<BitrixUpdateLeadCfg>(step);
  const upstreamRows = ctx.getUpstreamRows(step.position);
  if (ctx.outputs?.has(step.position - 1) && upstreamRows.length === 0) {
    return { rowCount: 0, rows: [], message: "0 upstream rows; skipped" };
  }
  const result = await updateLead(
    {
      leadId: config.leadId,
      title: config.title,
      statusId: config.statusId,
      comments: config.comments,
    },
    userId,
  );
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
  "trigger.watch.sheets_new_rows": triggerWatchSheetsNewRowsHandler,
  "trigger.watch.bitrix_new_lead": triggerWatchHandler,

  // Google Sheets
  "sheets.append": sheetsAppendHandler,
  "sheets.upsert": sheetsUpsertHandler,
  "sheets.find_rows": sheetsFindRowsHandler,
  "sheets.update_row": sheetsUpdateRowHandler,
  "sheets.delete_row": notImplementedHandler,
  "sheets.get_row": notImplementedHandler,
  "sheets.create_tab": notImplementedHandler,

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
