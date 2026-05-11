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
} from "~/integrations/facebook/graph-client";

import {
  appendRows,
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

const triggerScheduleHandler: Handler = async (_step, _ctx, _userId) => {
  return { rowCount: 0 };
};

const triggerManualHandler: Handler = async (_step, _ctx, _userId) => {
  return { rowCount: 0 };
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

// ── Google Sheets handlers ────────────────────────────────────────────────────

type SheetsCfg = {
  spreadsheetId: string;
  tabName: string;
  mappedFields?: string[];
};

type SheetsUpsertCfg = SheetsCfg & {
  keyFields: string[];
};

function projectRows(rows: unknown[], mappedFields?: string[]): unknown[] {
  if (!mappedFields || mappedFields.length === 0) return rows;
  return rows.map((row) => {
    if (typeof row !== "object" || row === null) return row;
    const projected: Record<string, unknown> = {};
    for (const field of mappedFields) {
      projected[field] = (row as Record<string, unknown>)[field];
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

// ── Registry ──────────────────────────────────────────────────────────────────

const HANDLERS: Record<string, Handler> = {
  "trigger.schedule": triggerScheduleHandler,
  "trigger.manual": triggerManualHandler,
  "fb.account_insights": fbAccountInsightsHandler,
  "fb.campaign_insights": fbCampaignInsightsHandler,
  "fb.ad_insights": fbAdInsightsHandler,
  "sheets.append": sheetsAppendHandler,
  "sheets.upsert": sheetsUpsertHandler,
};

export function getHandler(moduleType: string): Handler {
  const handler = HANDLERS[moduleType];
  if (!handler) {
    throw new Error(`No handler registered for module type: ${moduleType}`);
  }
  return handler;
}
