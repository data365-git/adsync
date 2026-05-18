import type { ModuleType } from "~/server/mocks/types";

export type ModuleGroup =
  | "trigger"
  | "triggers"
  | "facebook"
  | "sheets"
  | "googleSheets"
  | "bitrix24";

type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "cron"
  | "text"
  | "sheets-picker"
  | "select"
  | "textarea"
  | "fieldMapping";

export type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  /** Always-visible plain help text rendered below the field label. */
  help?: string;
  /** Options for `type: 'select'` fields. */
  options?: { value: string; label: string }[];
};

export type ModuleDefinition = {
  id: ModuleType;
  name: string;
  /** Compact name used in collapsed step-card auto-summary subtitles. */
  shortName: string;
  description: string;
  group: ModuleGroup;
  /** lucide-react icon name; legacy hint, the UI reads `getIntegrationMeta` instead. */
  icon?: string;
  /**
   * `true` when this module's output is an array of items. Downstream cards
   * render the "Iterates per item" badge and FieldMappingPicker prefixes
   * option keys with `item.`.
   */
  outputsArray?: boolean;
  configSchema: ConfigField[];
  /**
   * Realistic sample output rows. Used by:
   *   - Step Card "Sample" tab (renders a 3-row × ≤5-column mini-table)
   *   - FieldMappingPicker — derives available output field keys from row[0]
   * Always provide at least one row; modules with `outputsArray: true` provide 3.
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
    id: "trigger.webhook",
    name: "Webhook",
    shortName: "Webhook",
    description: "Trigger when an HTTP POST request hits the scenario's unique webhook URL.",
    group: "trigger",
    icon: "Webhook",
    configSchema: [
      {
        key: "secret",
        label: "Signing secret (optional)",
        type: "string",
        required: false,
        description: "If set, incoming requests must include X-Webhook-Secret matching this value.",
      },
    ],
    sampleOutput: [
      {
        receivedAt: "2026-05-09T10:12:00.000Z",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { event: "lead.created", id: "lead_099" },
      },
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

// ─── Phase 3 additions ──────────────────────────────────────────────────────
// New triggers (Watch family) and 13 new action modules across Facebook,
// Google Sheets, and Bitrix24. Runtime is mocked: every new module returns its
// `sampleOutput` from the executor handler. Real API wiring is Phase 4.

const PHASE_3_MODULES: ModuleDefinition[] = [
  {
    id: "trigger.watch.sheets_new_rows",
    name: "Watch Sheets — New Rows",
    shortName: "Watch New Rows",
    description:
      "Fires when a new row is appended to the watched Google Sheets tab.",
    group: "triggers",
    outputsArray: false,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet",
        type: "sheets-picker",
        required: true,
      },
      { key: "tabName", label: "Tab", type: "sheets-picker", required: true },
      {
        key: "watchColumn",
        label: "Watch column",
        type: "sheets-picker",
        required: true,
      },
    ],
    sampleOutput: [
      {
        row: 14,
        id: "99",
        name: "New Contact",
        email: "new@example.com",
        createdAt: "2025-05-11T08:00:00Z",
      },
    ],
  },
  {
    id: "trigger.watch.bitrix_new_lead",
    name: "Watch Bitrix — New Lead",
    shortName: "Watch New Lead",
    description:
      "Fires when a new lead matching filter criteria appears in Bitrix24 CRM.",
    group: "triggers",
    outputsArray: false,
    configSchema: [
      {
        key: "pipeline",
        label: "Pipeline",
        type: "text",
        required: false,
        help: "Filter by pipeline name (leave blank for all)",
      },
      {
        key: "filterField",
        label: "Filter field",
        type: "select",
        required: false,
        options: [
          { value: "", label: "Any new lead" },
          { value: "SOURCE_ID", label: "By source" },
          { value: "STATUS_ID", label: "By status" },
        ],
      },
      {
        key: "filterValue",
        label: "Filter value",
        type: "text",
        required: false,
      },
    ],
    sampleOutput: [
      {
        id: "lead_099",
        title: "New website lead",
        status: "NEW",
        createdAt: "2025-05-11T08:30:00Z",
      },
    ],
  },
  {
    id: "fb.list_ad_accounts",
    name: "List Ad Accounts",
    shortName: "List Ad Accounts",
    description:
      "Returns all Facebook Ad Accounts accessible to the connected user.",
    group: "facebook",
    outputsArray: true,
    configSchema: [],
    sampleOutput: [
      {
        id: "act_111111111",
        name: "Acme Corp Ads",
        currency: "USD",
        status: "ACTIVE",
      },
      {
        id: "act_222222222",
        name: "Test Account",
        currency: "EUR",
        status: "PAUSED",
      },
      {
        id: "act_333333333",
        name: "Brand B",
        currency: "USD",
        status: "ACTIVE",
      },
    ],
  },
  {
    id: "fb.list_ads",
    name: "List Ads",
    shortName: "List Ads",
    description:
      "Returns ads in an ad account, optionally filtered by campaign or status.",
    group: "facebook",
    outputsArray: true,
    configSchema: [
      {
        key: "fbAccountId",
        label: "Ad Account ID",
        type: "text",
        required: true,
        help: "Format: act_XXXXXXXXX — find this in Facebook Ads Manager",
      },
      {
        key: "campaignId",
        label: "Campaign ID",
        type: "text",
        required: false,
        help: "Leave blank to return ads from all campaigns",
      },
      {
        key: "status",
        label: "Status filter",
        type: "select",
        required: false,
        options: [
          { value: "", label: "All statuses" },
          { value: "ACTIVE", label: "Active" },
          { value: "PAUSED", label: "Paused" },
          { value: "ARCHIVED", label: "Archived" },
        ],
      },
    ],
    sampleOutput: [
      {
        id: "23001",
        name: "Summer promo — Banner A",
        status: "ACTIVE",
        campaign_id: "9001",
        creative_thumbnail: "https://placehold.co/60x60",
      },
      {
        id: "23002",
        name: "Summer promo — Banner B",
        status: "PAUSED",
        campaign_id: "9001",
        creative_thumbnail: "https://placehold.co/60x60",
      },
      {
        id: "23003",
        name: "Retargeting — CTA",
        status: "ACTIVE",
        campaign_id: "9002",
        creative_thumbnail: "https://placehold.co/60x60",
      },
    ],
  },
  {
    id: "fb.get_ad",
    name: "Get Ad",
    shortName: "Get Ad",
    description:
      "Returns full details for a single Facebook ad including creative and targeting summary.",
    group: "facebook",
    outputsArray: false,
    configSchema: [
      {
        key: "adId",
        label: "Ad ID",
        type: "text",
        required: true,
        help: "The numeric Facebook ad ID (e.g. 23001234567890)",
      },
    ],
    sampleOutput: [
      {
        id: "23001",
        name: "Summer promo — Banner A",
        status: "ACTIVE",
        creative: { title: "Summer Sale", body: "Up to 50% off" },
        targeting_summary: "Ages 25-45 · US · Interests: Travel, Fashion",
      },
    ],
  },
  {
    id: "sheets.find_rows",
    name: "Find Rows",
    shortName: "Find Rows",
    description:
      "Searches a sheet tab for rows matching a column value and returns all matches.",
    group: "googleSheets",
    outputsArray: true,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        required: true,
        help: "The ID from your Google Sheets URL (between /d/ and /edit)",
      },
      {
        key: "tabName",
        label: "Tab name",
        type: "text",
        required: true,
        help: "Name of the sheet tab to search",
      },
      {
        key: "searchColumn",
        label: "Search column",
        type: "text",
        required: true,
        help: 'Column header to match against (e.g. "email")',
      },
      {
        key: "searchValue",
        label: "Search value",
        type: "text",
        required: true,
        help: "Value to search for in that column",
      },
    ],
    sampleOutput: [
      { row: 2, email: "alice@example.com", name: "Alice", status: "active" },
      {
        row: 7,
        email: "alice+promo@example.com",
        name: "Alice P",
        status: "pending",
      },
      { row: 12, email: "alice2@example.com", name: "Alice Q", status: "active" },
    ],
  },
  {
    id: "sheets.update_row",
    name: "Update Row",
    shortName: "Update Row",
    description:
      "Updates a specific row in a sheet by row index or by a key column match.",
    group: "googleSheets",
    outputsArray: false,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        required: true,
        help: "The ID from your Google Sheets URL",
      },
      {
        key: "tabName",
        label: "Tab name",
        type: "text",
        required: true,
        help: "Name of the sheet tab",
      },
      {
        key: "rowIdentifier",
        label: "Row identifier",
        type: "text",
        required: true,
        help: 'Row number (e.g. "3") OR key column + value (e.g. "id=42")',
      },
      {
        key: "mappedFields",
        label: "Fields to update",
        type: "fieldMapping",
        required: true,
        help: "Map column headers to values from upstream steps",
      },
    ],
    sampleOutput: [
      { row: 3, status: "updated", updatedFields: ["status", "updatedAt"] },
    ],
  },
  {
    id: "sheets.delete_row",
    name: "Delete Row",
    shortName: "Delete Row",
    description: "Deletes a specific row from a sheet tab by row index.",
    group: "googleSheets",
    outputsArray: false,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        required: true,
        help: "The ID from your Google Sheets URL",
      },
      {
        key: "tabName",
        label: "Tab name",
        type: "text",
        required: true,
        help: "Name of the sheet tab",
      },
      {
        key: "rowIdentifier",
        label: "Row identifier",
        type: "text",
        required: true,
        help: "Row number to delete (1-indexed)",
      },
    ],
    sampleOutput: [{ deleted: true, rowIndex: 3 }],
  },
  {
    id: "sheets.get_row",
    name: "Get Row",
    shortName: "Get Row",
    description: "Returns the contents of a specific row by row index.",
    group: "googleSheets",
    outputsArray: false,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        required: true,
        help: "The ID from your Google Sheets URL",
      },
      {
        key: "tabName",
        label: "Tab name",
        type: "text",
        required: true,
        help: "Name of the sheet tab",
      },
      {
        key: "rowIndex",
        label: "Row index",
        type: "number",
        required: true,
        help: "Row number to retrieve (1-indexed; row 1 is the header row)",
      },
    ],
    sampleOutput: [
      {
        row: 5,
        id: "42",
        name: "Bob Smith",
        email: "bob@example.com",
        status: "active",
      },
    ],
  },
  {
    id: "sheets.create_tab",
    name: "Create Tab",
    shortName: "Create Tab",
    description:
      "Adds a new tab (sheet) to a spreadsheet with an optional header row.",
    group: "googleSheets",
    outputsArray: false,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        required: true,
        help: "The ID from your Google Sheets URL",
      },
      {
        key: "newTabName",
        label: "New tab name",
        type: "text",
        required: true,
        help: "Name for the new sheet tab (must be unique; avoid / [ ] * ? : \\)",
      },
      {
        key: "headerRow",
        label: "Header row",
        type: "text",
        required: false,
        help: 'Optional. Comma-separated column headers (e.g. "id,name,email,createdAt")',
      },
    ],
    sampleOutput: [{ tabName: "Leads_2025", created: true }],
  },
  {
    id: "sheets.watch_new_rows",
    name: "Watch — New Rows",
    shortName: "Watch New Rows",
    description:
      "Triggers whenever a new row is appended to a sheet tab. (Polling — Phase 4 wires real polling.)",
    group: "googleSheets",
    outputsArray: false,
    configSchema: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        required: true,
        help: "The ID from your Google Sheets URL",
      },
      {
        key: "tabName",
        label: "Tab name",
        type: "text",
        required: true,
        help: "Name of the sheet tab to watch",
      },
      {
        key: "watchColumn",
        label: "Watch column",
        type: "text",
        required: true,
        help: 'Column header used to detect new rows (e.g. "id"). Values must be unique per row.',
      },
    ],
    sampleOutput: [
      {
        row: 14,
        id: "99",
        name: "New Contact",
        email: "new@example.com",
        createdAt: "2025-05-11T08:00:00Z",
      },
    ],
  },
  {
    id: "bitrix.create_lead",
    name: "Create Lead",
    shortName: "Create Lead",
    description:
      "Creates a new lead in Bitrix24 CRM with contact details and source.",
    group: "bitrix24",
    outputsArray: false,
    configSchema: [
      {
        key: "title",
        label: "Lead title",
        type: "text",
        required: true,
        help: 'Short descriptive title for the lead (e.g. "Website inquiry — Alice")',
      },
      {
        key: "name",
        label: "First name",
        type: "text",
        required: true,
        help: "Contact first name",
      },
      {
        key: "lastName",
        label: "Last name",
        type: "text",
        required: false,
        help: "Contact last name",
      },
      {
        key: "phone",
        label: "Phone",
        type: "text",
        required: false,
        help: "Phone number in any format",
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        required: false,
        help: "Contact email address",
      },
      {
        key: "sourceId",
        label: "Source",
        type: "select",
        required: true,
        options: [
          { value: "WEB", label: "Website" },
          { value: "CALL", label: "Inbound call" },
          { value: "EMAIL", label: "Email" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        key: "comments",
        label: "Comments",
        type: "textarea",
        required: false,
        help: "Additional notes to attach to the lead",
      },
    ],
    sampleOutput: [{ leadId: "lead_001", createdAt: "2025-05-11T08:00:00Z" }],
  },
  {
    id: "bitrix.update_lead",
    name: "Update Lead",
    shortName: "Update Lead",
    description: "Updates fields on an existing Bitrix24 lead by ID.",
    group: "bitrix24",
    outputsArray: false,
    configSchema: [
      {
        key: "leadId",
        label: "Lead ID",
        type: "text",
        required: true,
        help: "The numeric ID of the lead to update",
      },
      {
        key: "title",
        label: "New title",
        type: "text",
        required: false,
        help: "Leave blank to keep existing title",
      },
      {
        key: "statusId",
        label: "Status",
        type: "select",
        required: false,
        options: [
          { value: "", label: "No change" },
          { value: "NEW", label: "New" },
          { value: "IN_PROCESS", label: "In process" },
          { value: "PROCESSED", label: "Processed" },
          { value: "CONVERTED", label: "Converted" },
        ],
      },
      { key: "comments", label: "Comments", type: "textarea", required: false },
    ],
    sampleOutput: [{ leadId: "lead_001", updated: true }],
  },
  {
    id: "bitrix.find_leads",
    name: "Find Leads",
    shortName: "Find Leads",
    description:
      "Searches Bitrix24 CRM for leads matching a field filter and returns matches.",
    group: "bitrix24",
    outputsArray: true,
    configSchema: [
      {
        key: "filterField",
        label: "Filter field",
        type: "select",
        required: true,
        options: [
          { value: "EMAIL", label: "Email" },
          { value: "PHONE", label: "Phone" },
          { value: "STATUS_ID", label: "Status" },
          { value: "SOURCE_ID", label: "Source" },
        ],
      },
      {
        key: "filterValue",
        label: "Filter value",
        type: "text",
        required: true,
        help: "Value to match against the selected field",
      },
      {
        key: "limit",
        label: "Limit",
        type: "number",
        required: false,
        help: "Maximum results to return (default 10, max 50)",
      },
    ],
    sampleOutput: [
      {
        id: "lead_001",
        title: "Website inquiry — Alice",
        status: "NEW",
        createdAt: "2025-05-01T09:00:00Z",
      },
      {
        id: "lead_002",
        title: "Inbound call — Bob",
        status: "IN_PROCESS",
        createdAt: "2025-05-03T14:30:00Z",
      },
      {
        id: "lead_003",
        title: "Email inquiry — Carol",
        status: "PROCESSED",
        createdAt: "2025-05-07T11:00:00Z",
      },
    ],
  },
  {
    id: "bitrix.create_deal",
    name: "Create Deal",
    shortName: "Create Deal",
    description:
      "Creates a new deal in a Bitrix24 pipeline with opportunity amount.",
    group: "bitrix24",
    outputsArray: false,
    configSchema: [
      {
        key: "title",
        label: "Deal title",
        type: "text",
        required: true,
        help: "Title for the new deal",
      },
      {
        key: "categoryId",
        label: "Pipeline ID",
        type: "text",
        required: true,
        help: "Bitrix24 pipeline (category) ID — found in CRM settings",
      },
      {
        key: "stageId",
        label: "Stage ID",
        type: "text",
        required: true,
        help: 'Stage within the pipeline (e.g. "C1:NEW")',
      },
      {
        key: "opportunity",
        label: "Deal amount",
        type: "number",
        required: false,
        help: "Monetary value of the deal",
      },
      {
        key: "currency",
        label: "Currency",
        type: "text",
        required: false,
        help: 'ISO 4217 currency code (e.g. "USD"). Defaults to account currency.',
      },
      {
        key: "contactId",
        label: "Contact ID",
        type: "text",
        required: false,
        help: "Optional — link to existing Bitrix24 contact by ID",
      },
    ],
    sampleOutput: [{ dealId: "deal_001", createdAt: "2025-05-11T08:00:00Z" }],
  },
  {
    id: "bitrix.update_deal",
    name: "Update Deal",
    shortName: "Update Deal",
    description: "Updates fields on an existing Bitrix24 deal by ID.",
    group: "bitrix24",
    outputsArray: false,
    configSchema: [
      {
        key: "dealId",
        label: "Deal ID",
        type: "text",
        required: true,
        help: "The numeric ID of the deal to update",
      },
      {
        key: "stageId",
        label: "New stage",
        type: "text",
        required: false,
        help: "Stage ID to move the deal to (leave blank for no change)",
      },
      {
        key: "opportunity",
        label: "New amount",
        type: "number",
        required: false,
      },
      { key: "comments", label: "Comments", type: "textarea", required: false },
    ],
    sampleOutput: [{ dealId: "deal_001", updated: true }],
  },
];

MODULES.push(...PHASE_3_MODULES);

export function getModule(type: ModuleType): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === type);
}
