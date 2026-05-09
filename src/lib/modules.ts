import type { ModuleType } from "~/server/mocks/types";

export type ModuleGroup = "trigger" | "facebook" | "sheets";

type FieldType = "string" | "number" | "boolean" | "string[]" | "cron";

export type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
};

export type ModuleDefinition = {
  id: ModuleType;
  name: string;
  description: string;
  group: ModuleGroup;
  /** lucide-react icon name; the UI imports it dynamically. */
  icon: string;
  configSchema: ConfigField[];
  /** Realistic single-row output the next step will see in FieldMappingPicker. */
  sampleOutput: Record<string, unknown>;
};

export const MODULES: ModuleDefinition[] = [
  {
    id: "trigger.schedule",
    name: "Schedule",
    description: "Run on a recurring schedule via cron expression.",
    group: "trigger",
    icon: "Clock",
    configSchema: [
      {
        key: "cronExpression",
        label: "Cron expression",
        type: "cron",
        required: true,
        description: "Standard 5-field cron, e.g. `0 6 * * *`",
      },
      {
        key: "timezone",
        label: "Timezone",
        type: "string",
        required: true,
      },
    ],
    sampleOutput: {
      triggeredAt: "2026-05-09T06:00:00.000Z",
      runId: "run_sample_001",
    },
  },
  {
    id: "trigger.manual",
    name: "Manual run",
    description: "Run only when you click Run Now.",
    group: "trigger",
    icon: "Zap",
    configSchema: [],
    sampleOutput: {
      triggeredAt: "2026-05-09T14:32:00.000Z",
      runId: "run_sample_002",
      triggeredBy: "user_01",
    },
  },
  {
    id: "fb.account_insights",
    name: "Get Account Insights",
    description: "Fetch account-level metrics from Facebook Ads.",
    group: "facebook",
    icon: "BarChart2",
    configSchema: [
      { key: "fbAccountId", label: "Ad account", type: "string", required: true },
      {
        key: "dateWindowDays",
        label: "Date window (days)",
        type: "number",
        required: true,
      },
      { key: "metrics", label: "Metrics", type: "string[]", required: true },
    ],
    sampleOutput: {
      date: "2026-05-09",
      account_id: "act_109283746501283",
      account_name: "Brand Awareness — UZ",
      impressions: 124530,
      reach: 87412,
      clicks: 1893,
      ctr: 0.0152,
      spend: 234.78,
      cpm: 1.88,
      cpc: 0.124,
    },
  },
  {
    id: "fb.campaign_insights",
    name: "Get Campaign Insights",
    description: "Fetch per-campaign metrics from Facebook Ads.",
    group: "facebook",
    icon: "Megaphone",
    configSchema: [
      { key: "fbAccountId", label: "Ad account", type: "string", required: true },
      {
        key: "dateWindowDays",
        label: "Date window (days)",
        type: "number",
        required: true,
      },
      { key: "metrics", label: "Metrics", type: "string[]", required: true },
      {
        key: "campaignFilter",
        label: "Campaign filter (optional)",
        type: "string",
        required: false,
        description: "Comma-separated campaign IDs; leave empty for all.",
      },
    ],
    sampleOutput: {
      date: "2026-05-09",
      campaign_id: "23845678234",
      campaign_name: "Spring sale — retargeting",
      impressions: 18432,
      reach: 12108,
      clicks: 287,
      ctr: 0.0156,
      spend: 41.22,
      cpm: 2.24,
      cpc: 0.144,
      conversions: 14,
    },
  },
  {
    id: "fb.ad_insights",
    name: "Get Ad Insights",
    description: "Fetch per-ad metrics from Facebook Ads.",
    group: "facebook",
    icon: "Image",
    configSchema: [
      { key: "fbAccountId", label: "Ad account", type: "string", required: true },
      {
        key: "dateWindowDays",
        label: "Date window (days)",
        type: "number",
        required: true,
      },
      { key: "metrics", label: "Metrics", type: "string[]", required: true },
      {
        key: "campaignFilter",
        label: "Campaign filter (optional)",
        type: "string",
        required: false,
      },
    ],
    sampleOutput: {
      date: "2026-05-09",
      ad_id: "6066123456789",
      ad_name: "Hero video — variant B",
      campaign_id: "23845678234",
      adset_id: "6047123456789",
      impressions: 4321,
      clicks: 67,
      ctr: 0.0155,
      spend: 9.87,
      video_views: 2814,
      video_view_rate: 0.6513,
    },
  },
  {
    id: "sheets.append",
    name: "Append Rows",
    description: "Add rows to the bottom of a Google Sheets tab.",
    group: "sheets",
    icon: "Table2",
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "string",
        required: true,
      },
      { key: "tabName", label: "Tab name", type: "string", required: true },
      {
        key: "mappedFields",
        label: "Fields to write",
        type: "string[]",
        required: true,
      },
    ],
    sampleOutput: {
      rowsAppended: 14,
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
      lastRow: 287,
    },
  },
  {
    id: "sheets.upsert",
    name: "Upsert Rows",
    description:
      "Insert or update rows by key fields. Uses Append + Update under the hood.",
    group: "sheets",
    icon: "TableProperties",
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "string",
        required: true,
      },
      { key: "tabName", label: "Tab name", type: "string", required: true },
      {
        key: "keyFields",
        label: "Key fields",
        type: "string[]",
        required: true,
        description: "Rows matching these keys are updated; the rest appended.",
      },
      {
        key: "mappedFields",
        label: "Fields to write",
        type: "string[]",
        required: true,
      },
    ],
    sampleOutput: {
      rowsAppended: 6,
      rowsUpdated: 8,
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
    },
  },
];

export function getModule(type: ModuleType): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === type);
}
