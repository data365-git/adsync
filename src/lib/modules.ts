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
  /** Compact name used in collapsed step-card auto-summary subtitles. */
  shortName: string;
  description: string;
  group: ModuleGroup;
  /** lucide-react icon name; the UI imports it dynamically. */
  icon: string;
  configSchema: ConfigField[];
  /**
   * Realistic sample output rows. Used by:
   *   - Step Card "Sample" tab (renders a 3-row × ≤5-column mini-table)
   *   - FieldMappingPicker — derives available output field keys from row[0]
   * Always provide at least one row; 3+ rows give the Sample tab variety.
   */
  sampleOutput: Record<string, unknown>[];
};

export const MODULES: ModuleDefinition[] = [
  {
    id: "trigger.schedule",
    name: "Schedule",
    shortName: "Schedule",
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
    sampleOutput: [
      { triggeredAt: "2026-05-09T06:00:00.000Z", runId: "run_sample_001" },
      { triggeredAt: "2026-05-08T06:00:00.000Z", runId: "run_sample_000" },
      { triggeredAt: "2026-05-07T06:00:00.000Z", runId: "run_sample_-01" },
    ],
  },
  {
    id: "trigger.manual",
    name: "Manual run",
    shortName: "Manual",
    description: "Run only when you click Run Now.",
    group: "trigger",
    icon: "Zap",
    configSchema: [],
    sampleOutput: [
      {
        triggeredAt: "2026-05-09T14:32:00.000Z",
        runId: "run_sample_002",
        triggeredBy: "user_01",
      },
      {
        triggeredAt: "2026-05-09T11:08:00.000Z",
        runId: "run_sample_002a",
        triggeredBy: "user_01",
      },
      {
        triggeredAt: "2026-05-08T16:54:00.000Z",
        runId: "run_sample_002b",
        triggeredBy: "user_01",
      },
    ],
  },
  {
    id: "fb.account_insights",
    name: "Get Account Insights",
    shortName: "Get Account Insights",
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
    sampleOutput: [
      {
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
      {
        date: "2026-05-08",
        account_id: "act_109283746501283",
        account_name: "Brand Awareness — UZ",
        impressions: 118842,
        reach: 81203,
        clicks: 1721,
        ctr: 0.0145,
        spend: 218.5,
        cpm: 1.84,
        cpc: 0.127,
      },
      {
        date: "2026-05-07",
        account_id: "act_109283746501283",
        account_name: "Brand Awareness — UZ",
        impressions: 132019,
        reach: 92855,
        clicks: 2017,
        ctr: 0.0153,
        spend: 247.93,
        cpm: 1.88,
        cpc: 0.123,
      },
    ],
  },
  {
    id: "fb.campaign_insights",
    name: "Get Campaign Insights",
    shortName: "Get Campaign Insights",
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
    sampleOutput: [
      {
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
      {
        date: "2026-05-09",
        campaign_id: "23845678235",
        campaign_name: "Spring sale — prospecting",
        impressions: 42118,
        reach: 38090,
        clicks: 412,
        ctr: 0.0098,
        spend: 78.34,
        cpm: 1.86,
        cpc: 0.19,
        conversions: 9,
      },
      {
        date: "2026-05-09",
        campaign_id: "23845678236",
        campaign_name: "Brand awareness — UZ",
        impressions: 64512,
        reach: 51228,
        clicks: 803,
        ctr: 0.0124,
        spend: 95.7,
        cpm: 1.48,
        cpc: 0.119,
        conversions: 21,
      },
    ],
  },
  {
    id: "fb.ad_insights",
    name: "Get Ad Insights",
    shortName: "Get Ad Insights",
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
    sampleOutput: [
      {
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
      {
        date: "2026-05-09",
        ad_id: "6066123456790",
        ad_name: "Hero video — variant A",
        campaign_id: "23845678234",
        adset_id: "6047123456789",
        impressions: 3892,
        clicks: 51,
        ctr: 0.0131,
        spend: 8.42,
        video_views: 2401,
        video_view_rate: 0.617,
      },
      {
        date: "2026-05-09",
        ad_id: "6066123456791",
        ad_name: "Carousel — top 3 products",
        campaign_id: "23845678235",
        adset_id: "6047123456790",
        impressions: 7841,
        clicks: 124,
        ctr: 0.0158,
        spend: 17.05,
        video_views: 0,
        video_view_rate: 0,
      },
    ],
  },
  {
    id: "sheets.append",
    name: "Append Rows",
    shortName: "Append Rows",
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
    sampleOutput: [
      {
        rowsAppended: 14,
        spreadsheetUrl:
          "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
        lastRow: 287,
      },
      {
        rowsAppended: 11,
        spreadsheetUrl:
          "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
        lastRow: 273,
      },
      {
        rowsAppended: 17,
        spreadsheetUrl:
          "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
        lastRow: 262,
      },
    ],
  },
  {
    id: "sheets.upsert",
    name: "Upsert Rows",
    shortName: "Upsert Rows",
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
    sampleOutput: [
      {
        rowsAppended: 6,
        rowsUpdated: 8,
        spreadsheetUrl:
          "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
      },
      {
        rowsAppended: 4,
        rowsUpdated: 12,
        spreadsheetUrl:
          "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
      },
      {
        rowsAppended: 9,
        rowsUpdated: 5,
        spreadsheetUrl:
          "https://docs.google.com/spreadsheets/d/1qZ7vK3xN9pL2mR8tY5uH1aB6cD4eF0gJsK7wM2nP8oV",
      },
    ],
  },
];

export function getModule(type: ModuleType): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === type);
}
