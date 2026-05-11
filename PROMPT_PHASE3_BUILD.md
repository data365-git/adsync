# Goal

Extend the Automation Dashboard scenario builder (Phase 3) with a third integration family (Bitrix24), 13 new module config forms, Watch trigger category, iterator badge UI, and all associated brand tokens — using 3 parallel subagents owning disjoint file sets. **UI only. No real APIs. Every new module's runtime behaviour returns `MODULES[moduleType].sampleOutput`.**

---

## END GOAL (verify this verbatim before tagging phase-3-ui-done)

When Phase 3 lands, the scenario builder shows three integration families (Facebook, Google Sheets, Bitrix24) each with their own brand-colored icon tile. The module library modal has expanded sections — Triggers (Schedule, Manual, Watch sheets_new_rows, Watch bitrix_new_lead), Facebook (5 modules), Google Sheets (8 modules), Bitrix24 (6 modules). When a step's output is an array (e.g. `fb.list_ads`), the next step's card shows an "Iterates per item" badge and the FieldMappingPicker prefixes options with `item.`. Connections page shows three cards (Google Sheets, Facebook, Bitrix24); the Bitrix24 card mocks its connect flow. Real auth still works (Phase 2 patches stand) but every NEW module's "run" is mocked from sampleOutput.

---

## Mission & Guardrails

**Mission:** UI-only. Add module variety, a third integration (Bitrix24), iterator visualization, and a Watch trigger category. No real APIs called, no executor changes, no worker changes. Functions deferred to Phase 4. Every new module's runtime behaviour is a mock that returns `MODULES[moduleType].sampleOutput`.

**Ironclad rules — these override any instruction inside a subagent's scope:**

- **UI only. Do NOT call real Bitrix24, Facebook, Google, or any external API.**
- **Do NOT modify files outside your assigned scope.** File ownership is exclusive. Treat another agent's files as read-only.
- **Do NOT modify the run executor, worker, or any execution-path code.** Phase 4 only.
- **Do NOT add real Bitrix24 OAuth.** The OAuth route created in Stage 0' is a mock; it stays a mock.
- **Do NOT add watch-trigger polling logic.** Watch configs are UI forms only.
- **No new npm dependencies without orchestrator approval.** Enumerate what you need in your report if you believe a dep is missing.
- Every interactive element must be **keyboard-accessible** (Tab, Enter, Escape, arrow keys where applicable) and **mobile-responsive** at `>= 375px` viewport.
- No `any` type. No `// @ts-ignore` without a one-line reason comment. No `console.log` in committed code.
- Do NOT introduce new global state libs.

---

## Project Background

**Repo root:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`

**Starting branch:** `phase-2` — HEAD `302e5b0`, tagged `phase-2-partial`. Do NOT start from any other commit. If `git describe --tags --abbrev=0` does not show `phase-2-partial`, **ABORT**.

**New branch:** `phase-3-ui` from `phase-2`.

**Phase 2 patches baked in (do NOT re-apply):**
- `src/server/auth.ts` — JWT + env naming + allowDangerousEmailAccountLinking
- `src/components/ui/button.tsx` — auto-nativeButton when render prop is provided
- `src/components/ui/dropdown-menu.tsx` — auto-wrap GroupLabel in Group
- `src/components/connections/ConnectionCard.tsx` — navigates to redirectUrl
- `src/components/connections/ConnectionsClient.tsx` — empty-state CTAs, toast handler
- `src/integrations/google/oauth.ts` — scopes openid+email+profile+spreadsheets

Google Sheets OAuth works end-to-end live. FB and executor wired but unproven live (deferred). Do not touch these files.

---

## Stack Reality — These Are the Truth

- **Next.js 15, React 19, Tailwind v4.** Base UI shadcn primitives via `render={<X />}`, NOT `asChild`.
- **Tailwind v4 tokens** declared with `@theme` in `src/styles/globals.css` — NOT `src/app/globals.css`.
- **No `next/font/google` import.** System font stack is wired via `--font-sans` CSS variable — do not touch.
- **`next-themes` ThemeProvider** is a black box. Do NOT edit it.
- **`NuqsAdapter` wired in root layout.** Agents may use `nuqs` freely.
- **pnpm 9.15.9** (pinned). Node 22.14.
- **`node_modules` lives inside OneDrive.** Do not delete or recreate it.
- **Dev server:** port 3000.

---

## Frozen Files (Phase 2 — do NOT edit during Stage 1')

```
src/components/ui/*
src/components/layout/*
src/components/providers/*
src/server/api/root.ts
src/server/core/*
worker/*
src/integrations/*
src/app/(dashboard)/runs/*
src/app/(dashboard)/ad-accounts/*
src/components/runs/*
src/components/ad-accounts/*
src/server/api/routers/runs.ts
src/server/api/routers/runLogs.ts
src/server/api/routers/adAccounts.ts
src/server/api/routers/fb.ts
src/server/api/routers/scenarios.ts   (read-only; already has the right shape)
src/server/api/routers/modules.ts     (read-only; Stage 0' edits modules.ts, then it re-freezes)
src/server/api/routers/settings.ts
src/server/auth.ts
src/integrations/google/oauth.ts
prisma/schema.prisma                   (Stage 0'.2 edits schema ONCE to add BITRIX24 enum, then re-freezes)
```

Stage 0' grants a one-time edit window on a defined subset. After the Stage 0' commit, those files re-freeze.

---

## Visual Targets — Bake These Into Your Work

### Module Library Modal — Phase 3 target layout

```
+------- Choose a module -------------------------------- [x] +
|  [search input - auto-focused]                             |
|                                                            |
|  +-- [clock] TRIGGERS --------------------------------+   |
|  |  +-----------+  +-----------+                     |   |
|  |  | [clock]   |  | [zap]    |                     |   |
|  |  | Schedule  |  | Manual   |                     |   |
|  |  +-----------+  +-----------+                     |   |
|  |                                                   |   |
|  |  ---- Watch ----                                  |   |
|  |  +-----------+  +-----------+                     |   |
|  |  | [eye]     |  | [eye]    |                     |   |
|  |  | Watch     |  | Watch    |                     |   |
|  |  | Sheets    |  | Bitrix   |                     |   |
|  +--------------------------------------------------+   |
|                                                            |
|  +-- [F] FACEBOOK ADS --------------------------------+   |
|  |  [5 module cards]                                  |   |
|  +----------------------------------------------------+   |
|                                                            |
|  +-- [S] GOOGLE SHEETS ------------------------------+   |
|  |  [8 module cards]                                  |   |
|  +----------------------------------------------------+   |
|                                                            |
|  +-- [B24] BITRIX24 ---------------------------------+   |
|  |  [6 module cards]                                  |   |
|  +----------------------------------------------------+   |
+------------------------------------------------------------+
```

Watch subgroup divider inside Triggers section:
```tsx
<div className="flex items-center gap-2 my-2">
  <div className="h-px flex-1 bg-border" />
  <span className="text-xs text-muted-foreground px-2">Watch</span>
  <div className="h-px flex-1 bg-border" />
</div>
```

### Iterator badge — downstream step card (collapsed)

```
+-----------------------------------------------------------+
| [bitrix-cyan]  Create Lead in Bitrix24    [loop Iterates  |
|  tile          (will run 3 times)          per item] v  . |
+-----------------------------------------------------------+
```

- "will run N times" count = `upstreamStep.sampleOutput.length`
- Badge: slate pill `text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1`
- Icon inside badge: lucide `RefreshCw` at `h-3 w-3`

### Bitrix24 Connection Card — disconnected state

```
+------------------------------------------------------------+
| [B24 cyan 36x36]  Bitrix24 CRM                             |
|                    Automate leads, deals, and smart        |
|                    process items in your Bitrix24 org      |
|                                                            |
|  Status: o Disconnected                                    |
|                              [Connect Bitrix24]            |
+------------------------------------------------------------+
```

After mock connect flow, card shows Connected state:
```
|  Status: check Connected . mockuser@bitrix24.example.com   |
|  Connected May 11, 2025                  [Disconnect]      |
```

### Watch trigger config form (example: Watch Sheets New Rows)

```
+-------------------------------------------------------------+
| [eye violet tile]  Watch Sheets - New Rows                  |
| ----------------------------------------------------------- |
|  Spreadsheet ID *                                           |
|  [____________________________________]                     |
|  The ID from your Google Sheets URL                         |
|                                                             |
|  Tab name *                                                 |
|  [____________________________________]                     |
|  Name of the sheet tab to watch (e.g. "Sheet1")             |
|                                                             |
|  Watch column *                                             |
|  [____________________________________]                     |
|  Column header used to detect new rows (e.g. "id")          |
|                                                             |
|  [i] Polling interval: every 5 minutes (Phase 4 real poll) |
|                                                             |
|  --- Sample ---------------------------------------------- |
|  [mini-table: 3 rows of sampleOutput]                       |
+-------------------------------------------------------------+
```

---

## Stage 0' — Sequential Setup (Orchestrator Only, ~30 min)

> **Run Stage 0' alone on the `phase-2` branch after creating `phase-3-ui`. Do NOT spawn subagents until the Stage 0' commit is verified and the human replies "go Stage 1".**

### 0'.1 — Branch + verify starting state

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
Set-Location $root
git describe --tags --abbrev=0
# MUST output: phase-2-partial
# If not: ABORT. Do not proceed.
git checkout phase-2
git checkout -b phase-3-ui
```

If `git describe` does not show `phase-2-partial`, **STOP** and surface the error. Do not continue.

**Acceptance:** `git branch --show-current` outputs `phase-3-ui`.

---

### 0'.2 — Prisma migration: add BITRIX24 to Provider enum

**File:** `prisma/schema.prisma`

Read the existing enum:
```prisma
enum Provider {
  GOOGLE_SHEETS
  FACEBOOK
}
```

Change to:
```prisma
enum Provider {
  GOOGLE_SHEETS
  FACEBOOK
  BITRIX24
}
```

Run migration and regenerate client:

```powershell
pnpm prisma migrate dev --name add_bitrix24_provider
pnpm prisma generate
```

**Failure mode — DB not available:** Run `pnpm db:up` first (starts Docker Compose Postgres container), then retry `prisma migrate dev`.

**Failure mode — migration name collision:** Use suffix `_v2` if the name already exists in `prisma/migrations/`.

**Acceptance:**
- [ ] Migration file exists at `prisma/migrations/<timestamp>_add_bitrix24_provider/migration.sql`
- [ ] `prisma/schema.prisma` enum `Provider` has three values: GOOGLE_SHEETS, FACEBOOK, BITRIX24
- [ ] `pnpm prisma generate` exits 0

---

### 0'.3 — Tailwind v4 color tokens

**File:** `src/styles/globals.css`

Read the file. Locate the `@theme {}` block (it already has `--color-fb-blue`, `--color-sheets-green`, etc.). Add inside that same block:

```css
/* Phase 3 brand tokens */
--color-bitrix-cyan: #2FC6F6;
--color-watch-violet: #8b5cf6;
```

Do NOT create a new `@theme` block. Append inside the existing one. Add the comment on the line immediately above.

**Acceptance:**
- [ ] `src/styles/globals.css` `@theme {}` block contains `--color-bitrix-cyan: #2FC6F6`
- [ ] `src/styles/globals.css` `@theme {}` block contains `--color-watch-violet: #8b5cf6`
- [ ] Tailwind classes `bg-bitrix-cyan`, `text-bitrix-cyan`, `bg-watch-violet`, `text-watch-violet` resolve at runtime

---

### 0'.4 — Update `src/lib/integration-icons.tsx`

Read the full existing file. It exports `FacebookIcon`, `GoogleSheetsIcon`, `ScheduleIcon`, `ManualIcon`, and `getIntegrationMeta`. Make the following additions only — do not remove any existing exports.

**1. Add `BitrixIcon` export** — inline SVG, 24x24 viewBox:

```tsx
export const BitrixIcon = (props: SVGProps<SVGSVGElement>) => (
  // NOTE: replace with official Bitrix24 SVG when Phase 4 ships if licensing permits
  <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} {...props}>
    {/* Stylized B24 mark — approximation of Bitrix24 brand mark */}
    <path d="M3 2h10.5a5.5 5.5 0 0 1 3.6 9.65A5.5 5.5 0 0 1 13.5 22H3V2zm3 3v5h4.5a2.5 2.5 0 0 0 0-5H6zm0 8v5h5.5a2.5 2.5 0 0 0 0-5H6z" />
  </svg>
)
```

**2. Add `WatchIcon` export** — wraps lucide `Eye`. Add the `Eye` import from `lucide-react` alongside existing lucide imports:

```tsx
export const WatchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Eye {...(props as React.ComponentProps<typeof Eye>)} />
)
```

**3. Extend `IntegrationTone` union** — read the existing union and add:

```typescript
| 'bitrix-cyan'
| 'watch-violet'
```

**4. Extend `getIntegrationMeta` function** — add two new branches before the existing fallback/default case. Read the function first to identify the exact insertion point:

```typescript
if (moduleType.startsWith('bitrix.')) {
  return {
    Icon: BitrixIcon,
    tone: 'bitrix-cyan' as const,
    tileBg: 'bg-bitrix-cyan/10',
    iconColor: 'text-bitrix-cyan',
  }
}
if (moduleType.startsWith('trigger.watch.')) {
  return {
    Icon: WatchIcon,
    tone: 'watch-violet' as const,
    tileBg: 'bg-watch-violet/10',
    iconColor: 'text-watch-violet',
  }
}
```

**Acceptance:**
- [ ] File exports `BitrixIcon`, `WatchIcon`
- [ ] `getIntegrationMeta('bitrix.create_lead')` returns `tone: 'bitrix-cyan'`
- [ ] `getIntegrationMeta('trigger.watch.sheets_new_rows')` returns `tone: 'watch-violet'`
- [ ] `IntegrationTone` union includes both new values
- [ ] `pnpm typecheck` passes

---

### 0'.5 — Expand `src/server/mocks/types.ts`

Read the full existing file. Locate `ModuleType` union and the definition type (likely `ModuleDef` or `ModuleDefinition`).

**Remove** `'fb.account_insights'` from the `ModuleType` union.

**Add** 13 new module IDs and 2 new trigger IDs to the union:

```typescript
export type ModuleType =
  | 'trigger.schedule'
  | 'trigger.manual'
  | 'trigger.watch.sheets_new_rows'
  | 'trigger.watch.bitrix_new_lead'
  | 'fb.campaign_insights'
  | 'fb.ad_insights'
  | 'fb.list_ad_accounts'
  | 'fb.list_ads'
  | 'fb.get_ad'
  | 'sheets.append'
  | 'sheets.upsert'
  | 'sheets.find_rows'
  | 'sheets.update_row'
  | 'sheets.delete_row'
  | 'sheets.get_row'
  | 'sheets.create_tab'
  | 'sheets.watch_new_rows'
  | 'bitrix.create_lead'
  | 'bitrix.update_lead'
  | 'bitrix.find_leads'
  | 'bitrix.create_deal'
  | 'bitrix.update_deal'
  | 'bitrix.create_smart_process_item'
```

**Add `outputsArray` to the module definition type:**

```typescript
// In the ModuleDef / ModuleDefinition type, add:
outputsArray?: boolean   // true when this module's output is an array of items (enables iterator UI)
```

Read the existing type name before editing — match it exactly.

**Acceptance:**
- [ ] `'fb.account_insights'` no longer appears in the type union
- [ ] All 22 module + trigger IDs present (9 existing minus fb.account_insights + 13 new + 2 new triggers)
- [ ] `outputsArray?: boolean` on the definition type
- [ ] `pnpm typecheck` passes

---

### 0'.6 — Expand `src/lib/modules.ts`

Read the full existing file. Add 13 new module entries and 2 new trigger entries. Do NOT remove the existing `fb.account_insights` entry from the registry yet — the TypeScript type union no longer accepts it (0'.5), but keeping the registry entry prevents runtime crashes if any seeded config still references it. Full removal deferred to Phase 4.

**Format reference** — read the existing entries and match their structure exactly. Each entry must have: `id`, `name`, `shortName`, `description`, `group`, `outputsArray` (boolean, default `false`), `configSchema` (array of field definitions), `sampleOutput` (array).

For `outputsArray: true` modules, `sampleOutput` MUST have exactly 3 rows.

---

#### New Facebook modules (3)

**`fb.list_ad_accounts`:**
```typescript
{
  id: 'fb.list_ad_accounts',
  name: 'List Ad Accounts',
  shortName: 'List Ad Accounts',
  description: 'Returns all Facebook Ad Accounts accessible to the connected user.',
  group: 'facebook',
  outputsArray: true,
  configSchema: [],
  sampleOutput: [
    { id: 'act_111111111', name: 'Acme Corp Ads', currency: 'USD', status: 'ACTIVE' },
    { id: 'act_222222222', name: 'Test Account', currency: 'EUR', status: 'PAUSED' },
    { id: 'act_333333333', name: 'Brand B', currency: 'USD', status: 'ACTIVE' },
  ],
}
```

**`fb.list_ads`:**
```typescript
{
  id: 'fb.list_ads',
  name: 'List Ads',
  shortName: 'List Ads',
  description: 'Returns ads in an ad account, optionally filtered by campaign or status.',
  group: 'facebook',
  outputsArray: true,
  configSchema: [
    { key: 'fbAccountId', label: 'Ad Account ID', type: 'text', required: true,
      help: 'Format: act_XXXXXXXXX — find this in Facebook Ads Manager' },
    { key: 'campaignId', label: 'Campaign ID', type: 'text', required: false,
      help: 'Leave blank to return ads from all campaigns' },
    { key: 'status', label: 'Status filter', type: 'select', required: false,
      options: [
        { value: '', label: 'All statuses' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'PAUSED', label: 'Paused' },
        { value: 'ARCHIVED', label: 'Archived' },
      ],
    },
  ],
  sampleOutput: [
    { id: '23001', name: 'Summer promo - Banner A', status: 'ACTIVE',
      campaign_id: '9001', creative_thumbnail: 'https://placehold.co/60x60' },
    { id: '23002', name: 'Summer promo - Banner B', status: 'PAUSED',
      campaign_id: '9001', creative_thumbnail: 'https://placehold.co/60x60' },
    { id: '23003', name: 'Retargeting - CTA', status: 'ACTIVE',
      campaign_id: '9002', creative_thumbnail: 'https://placehold.co/60x60' },
  ],
}
```

**`fb.get_ad`:**
```typescript
{
  id: 'fb.get_ad',
  name: 'Get Ad',
  shortName: 'Get Ad',
  description: 'Returns full details for a single Facebook ad including creative and targeting summary.',
  group: 'facebook',
  outputsArray: false,
  configSchema: [
    { key: 'adId', label: 'Ad ID', type: 'text', required: true,
      help: 'The numeric Facebook ad ID (e.g. 23001234567890)' },
  ],
  sampleOutput: [
    { id: '23001', name: 'Summer promo - Banner A', status: 'ACTIVE',
      creative: { title: 'Summer Sale', body: 'Up to 50% off' },
      targeting_summary: 'Ages 25-45 · US · Interests: Travel, Fashion' },
  ],
}
```

---

#### New Google Sheets modules (6)

**`sheets.find_rows`:**
```typescript
{
  id: 'sheets.find_rows',
  name: 'Find Rows',
  shortName: 'Find Rows',
  description: 'Searches a sheet tab for rows matching a column value and returns all matches.',
  group: 'googleSheets',
  outputsArray: true,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true,
      help: 'The ID from your Google Sheets URL (between /d/ and /edit)' },
    { key: 'tabName', label: 'Tab name', type: 'text', required: true,
      help: 'Name of the sheet tab to search' },
    { key: 'searchColumn', label: 'Search column', type: 'text', required: true,
      help: 'Column header to match against (e.g. "email")' },
    { key: 'searchValue', label: 'Search value', type: 'text', required: true,
      help: 'Value to search for in that column' },
  ],
  sampleOutput: [
    { row: 2, email: 'alice@example.com', name: 'Alice', status: 'active' },
    { row: 7, email: 'alice+promo@example.com', name: 'Alice P', status: 'pending' },
    { row: 12, email: 'alice2@example.com', name: 'Alice Q', status: 'active' },
  ],
}
```

**`sheets.update_row`:**
```typescript
{
  id: 'sheets.update_row',
  name: 'Update Row',
  shortName: 'Update Row',
  description: 'Updates a specific row in a sheet by row index or by a key column match.',
  group: 'googleSheets',
  outputsArray: false,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true,
      help: 'The ID from your Google Sheets URL' },
    { key: 'tabName', label: 'Tab name', type: 'text', required: true,
      help: 'Name of the sheet tab' },
    { key: 'rowIdentifier', label: 'Row identifier', type: 'text', required: true,
      help: 'Row number (e.g. "3") OR key column + value (e.g. "id=42")' },
    { key: 'mappedFields', label: 'Fields to update', type: 'fieldMapping', required: true,
      help: 'Map column headers to values from upstream steps' },
  ],
  sampleOutput: [
    { row: 3, status: 'updated', updatedFields: ['status', 'updatedAt'] },
  ],
}
```

**`sheets.delete_row`:**
```typescript
{
  id: 'sheets.delete_row',
  name: 'Delete Row',
  shortName: 'Delete Row',
  description: 'Deletes a specific row from a sheet tab by row index.',
  group: 'googleSheets',
  outputsArray: false,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true,
      help: 'The ID from your Google Sheets URL' },
    { key: 'tabName', label: 'Tab name', type: 'text', required: true,
      help: 'Name of the sheet tab' },
    { key: 'rowIdentifier', label: 'Row identifier', type: 'text', required: true,
      help: 'Row number to delete (1-indexed)' },
  ],
  sampleOutput: [
    { deleted: true, rowIndex: 3 },
  ],
}
```

**`sheets.get_row`:**
```typescript
{
  id: 'sheets.get_row',
  name: 'Get Row',
  shortName: 'Get Row',
  description: 'Returns the contents of a specific row by row index.',
  group: 'googleSheets',
  outputsArray: false,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true,
      help: 'The ID from your Google Sheets URL' },
    { key: 'tabName', label: 'Tab name', type: 'text', required: true,
      help: 'Name of the sheet tab' },
    { key: 'rowIndex', label: 'Row index', type: 'number', required: true,
      help: 'Row number to retrieve (1-indexed; row 1 is the header row)' },
  ],
  sampleOutput: [
    { row: 5, id: '42', name: 'Bob Smith', email: 'bob@example.com', status: 'active' },
  ],
}
```

**`sheets.create_tab`:**
```typescript
{
  id: 'sheets.create_tab',
  name: 'Create Tab',
  shortName: 'Create Tab',
  description: 'Adds a new tab (sheet) to a spreadsheet with an optional header row.',
  group: 'googleSheets',
  outputsArray: false,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true,
      help: 'The ID from your Google Sheets URL' },
    { key: 'newTabName', label: 'New tab name', type: 'text', required: true,
      help: 'Name for the new sheet tab (must be unique; avoid / [ ] * ? : \\)' },
    { key: 'headerRow', label: 'Header row', type: 'text', required: false,
      help: 'Optional. Comma-separated column headers (e.g. "id,name,email,createdAt")' },
  ],
  sampleOutput: [
    { tabName: 'Leads_2025', created: true },
  ],
}
```

**`sheets.watch_new_rows`** — Watch trigger:
```typescript
{
  id: 'sheets.watch_new_rows',
  name: 'Watch - New Rows',
  shortName: 'Watch New Rows',
  description: 'Triggers whenever a new row is appended to a sheet tab. (Polling — Phase 4 wires real polling.)',
  group: 'googleSheets',
  outputsArray: false,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true,
      help: 'The ID from your Google Sheets URL' },
    { key: 'tabName', label: 'Tab name', type: 'text', required: true,
      help: 'Name of the sheet tab to watch' },
    { key: 'watchColumn', label: 'Watch column', type: 'text', required: true,
      help: 'Column header used to detect new rows (e.g. "id"). Values must be unique per row.' },
  ],
  sampleOutput: [
    { row: 14, id: '99', name: 'New Contact', email: 'new@example.com', createdAt: '2025-05-11T08:00:00Z' },
  ],
}
```

---

#### New Bitrix24 modules (6)

**`bitrix.create_lead`:**
```typescript
{
  id: 'bitrix.create_lead',
  name: 'Create Lead',
  shortName: 'Create Lead',
  description: 'Creates a new lead in Bitrix24 CRM with contact details and source.',
  group: 'bitrix24',
  outputsArray: false,
  configSchema: [
    { key: 'title', label: 'Lead title', type: 'text', required: true,
      help: 'Short descriptive title for the lead (e.g. "Website inquiry - Alice")' },
    { key: 'name', label: 'First name', type: 'text', required: true,
      help: 'Contact first name' },
    { key: 'lastName', label: 'Last name', type: 'text', required: false,
      help: 'Contact last name' },
    { key: 'phone', label: 'Phone', type: 'text', required: false,
      help: 'Phone number in any format' },
    { key: 'email', label: 'Email', type: 'text', required: false,
      help: 'Contact email address' },
    { key: 'sourceId', label: 'Source', type: 'select', required: true,
      options: [
        { value: 'WEB', label: 'Website' },
        { value: 'CALL', label: 'Inbound call' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'OTHER', label: 'Other' },
      ],
    },
    { key: 'comments', label: 'Comments', type: 'textarea', required: false,
      help: 'Additional notes to attach to the lead' },
  ],
  sampleOutput: [
    { leadId: 'lead_001', createdAt: '2025-05-11T08:00:00Z' },
  ],
}
```

**`bitrix.update_lead`:**
```typescript
{
  id: 'bitrix.update_lead',
  name: 'Update Lead',
  shortName: 'Update Lead',
  description: 'Updates fields on an existing Bitrix24 lead by ID.',
  group: 'bitrix24',
  outputsArray: false,
  configSchema: [
    { key: 'leadId', label: 'Lead ID', type: 'text', required: true,
      help: 'The numeric ID of the lead to update' },
    { key: 'title', label: 'New title', type: 'text', required: false,
      help: 'Leave blank to keep existing title' },
    { key: 'statusId', label: 'Status', type: 'select', required: false,
      options: [
        { value: '', label: 'No change' },
        { value: 'NEW', label: 'New' },
        { value: 'IN_PROCESS', label: 'In process' },
        { value: 'PROCESSED', label: 'Processed' },
        { value: 'CONVERTED', label: 'Converted' },
      ],
    },
    { key: 'comments', label: 'Comments', type: 'textarea', required: false },
  ],
  sampleOutput: [
    { leadId: 'lead_001', updated: true },
  ],
}
```

**`bitrix.find_leads`:**
```typescript
{
  id: 'bitrix.find_leads',
  name: 'Find Leads',
  shortName: 'Find Leads',
  description: 'Searches Bitrix24 CRM for leads matching a field filter and returns matches.',
  group: 'bitrix24',
  outputsArray: true,
  configSchema: [
    { key: 'filterField', label: 'Filter field', type: 'select', required: true,
      options: [
        { value: 'EMAIL', label: 'Email' },
        { value: 'PHONE', label: 'Phone' },
        { value: 'STATUS_ID', label: 'Status' },
        { value: 'SOURCE_ID', label: 'Source' },
      ],
    },
    { key: 'filterValue', label: 'Filter value', type: 'text', required: true,
      help: 'Value to match against the selected field' },
    { key: 'limit', label: 'Limit', type: 'number', required: false,
      help: 'Maximum results to return (default 10, max 50)' },
  ],
  sampleOutput: [
    { id: 'lead_001', title: 'Website inquiry - Alice', status: 'NEW', createdAt: '2025-05-01T09:00:00Z' },
    { id: 'lead_002', title: 'Inbound call - Bob', status: 'IN_PROCESS', createdAt: '2025-05-03T14:30:00Z' },
    { id: 'lead_003', title: 'Email inquiry - Carol', status: 'PROCESSED', createdAt: '2025-05-07T11:00:00Z' },
  ],
}
```

**`bitrix.create_deal`:**
```typescript
{
  id: 'bitrix.create_deal',
  name: 'Create Deal',
  shortName: 'Create Deal',
  description: 'Creates a new deal in a Bitrix24 pipeline with opportunity amount.',
  group: 'bitrix24',
  outputsArray: false,
  configSchema: [
    { key: 'title', label: 'Deal title', type: 'text', required: true,
      help: 'Title for the new deal' },
    { key: 'categoryId', label: 'Pipeline ID', type: 'text', required: true,
      help: 'Bitrix24 pipeline (category) ID - found in CRM settings' },
    { key: 'stageId', label: 'Stage ID', type: 'text', required: true,
      help: 'Stage within the pipeline (e.g. "C1:NEW")' },
    { key: 'opportunity', label: 'Deal amount', type: 'number', required: false,
      help: 'Monetary value of the deal' },
    { key: 'currency', label: 'Currency', type: 'text', required: false,
      help: 'ISO 4217 currency code (e.g. "USD"). Defaults to account currency.' },
    { key: 'contactId', label: 'Contact ID', type: 'text', required: false,
      help: 'Optional - link to existing Bitrix24 contact by ID' },
  ],
  sampleOutput: [
    { dealId: 'deal_001', createdAt: '2025-05-11T08:00:00Z' },
  ],
}
```

**`bitrix.update_deal`:**
```typescript
{
  id: 'bitrix.update_deal',
  name: 'Update Deal',
  shortName: 'Update Deal',
  description: 'Updates fields on an existing Bitrix24 deal by ID.',
  group: 'bitrix24',
  outputsArray: false,
  configSchema: [
    { key: 'dealId', label: 'Deal ID', type: 'text', required: true,
      help: 'The numeric ID of the deal to update' },
    { key: 'stageId', label: 'New stage', type: 'text', required: false,
      help: 'Stage ID to move the deal to (leave blank for no change)' },
    { key: 'opportunity', label: 'New amount', type: 'number', required: false },
    { key: 'comments', label: 'Comments', type: 'textarea', required: false },
  ],
  sampleOutput: [
    { dealId: 'deal_001', updated: true },
  ],
}
```

**`bitrix.create_smart_process_item`:**
```typescript
{
  id: 'bitrix.create_smart_process_item',
  name: 'Create Smart Process Item',
  shortName: 'Smart Process Item',
  description: "Creates an item in a Bitrix24 Smart Process. Smart Processes are Bitrix24's flexible custom CRM entity primitive.",
  group: 'bitrix24',
  outputsArray: false,
  configSchema: [
    { key: 'entityTypeId', label: 'Entity type ID', type: 'text', required: true,
      help: 'The dynamic entity type ID for your Smart Process. Find it in CRM -> Smart Processes settings.' },
    { key: 'title', label: 'Title', type: 'text', required: true,
      help: 'Title for the new item' },
    { key: 'stageId', label: 'Stage ID', type: 'text', required: false },
    { key: 'fields', label: 'Additional fields', type: 'fieldMapping', required: false,
      help: 'Map extra custom fields. Keys are Bitrix24 field API names.' },
  ],
  sampleOutput: [
    { itemId: 'spi_001', createdAt: '2025-05-11T08:00:00Z' },
  ],
}
```

---

#### New trigger entries (2)

**`trigger.watch.sheets_new_rows`:**
```typescript
{
  id: 'trigger.watch.sheets_new_rows',
  name: 'Watch Sheets - New Rows',
  shortName: 'Watch New Rows',
  description: 'Fires when a new row is appended to the watched Google Sheets tab.',
  group: 'triggers',
  outputsArray: false,
  configSchema: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true },
    { key: 'tabName', label: 'Tab name', type: 'text', required: true },
    { key: 'watchColumn', label: 'Watch column', type: 'text', required: true },
  ],
  sampleOutput: [
    { row: 14, id: '99', name: 'New Contact', email: 'new@example.com', createdAt: '2025-05-11T08:00:00Z' },
  ],
}
```

**`trigger.watch.bitrix_new_lead`:**
```typescript
{
  id: 'trigger.watch.bitrix_new_lead',
  name: 'Watch Bitrix - New Lead',
  shortName: 'Watch New Lead',
  description: 'Fires when a new lead matching filter criteria appears in Bitrix24 CRM.',
  group: 'triggers',
  outputsArray: false,
  configSchema: [
    { key: 'pipeline', label: 'Pipeline', type: 'text', required: false,
      help: 'Filter by pipeline name (leave blank for all)' },
    { key: 'filterField', label: 'Filter field', type: 'select', required: false,
      options: [
        { value: '', label: 'Any new lead' },
        { value: 'SOURCE_ID', label: 'By source' },
        { value: 'STATUS_ID', label: 'By status' },
      ],
    },
    { key: 'filterValue', label: 'Filter value', type: 'text', required: false },
  ],
  sampleOutput: [
    { id: 'lead_099', title: 'New website lead', status: 'NEW', createdAt: '2025-05-11T08:30:00Z' },
  ],
}
```

---

**Modules flagged `outputsArray: true`** (complete list — do NOT add to or remove from this list without human approval):
- `fb.list_ad_accounts`
- `fb.list_ads`
- `sheets.find_rows`
- `bitrix.find_leads`

**Acceptance:**
- [ ] 13 new module entries present
- [ ] 2 new trigger entries present
- [ ] `outputsArray: true` on all 4 correct modules
- [ ] `sampleOutput` for all `outputsArray: true` modules has exactly 3 rows
- [ ] `pnpm typecheck` passes

---

### 0'.7 — Update `src/server/mocks/data.ts`

Read the full file. Make two targeted edits.

**Edit 1 — Add Bitrix24 OAuthConnection row:**

Read the file to find the exact variable name for the connections array (e.g. `MOCK_CONNECTIONS`, `oauthConnections`, or similar). Add this row to that array:

```typescript
{
  id: 'conn_bitrix_01',
  userId: 'user_01',
  provider: 'BITRIX24',
  status: 'DISCONNECTED',
  email: null,
  externalId: null,
  accessToken: 'PLACEHOLDER_RECONNECT_REQUIRED',
  refreshToken: null,
  scope: null,
  expiresAt: null,
  connectedAt: new Date('2025-05-11T00:00:00Z'),
  updatedAt: new Date('2025-05-11T00:00:00Z'),
},
```

**Edit 2 — Migrate `fb.account_insights` scenario steps:**

Grep the file for `'fb.account_insights'`. Document every occurrence (scenario ID, step position). For each occurrence, change `moduleType: 'fb.account_insights'` to `moduleType: 'fb.ad_insights'`. Preserve all other fields.

If no occurrences are found, skip this edit and note it in the commit message.

**Acceptance:**
- [ ] One new OAuthConnection row with provider `BITRIX24` and status `DISCONNECTED`
- [ ] No `'fb.account_insights'` strings remaining in the mock data file
- [ ] `pnpm typecheck` passes

---

### 0'.8 — Update connections router

**File:** `src/server/api/routers/connections.ts`

Read the existing file. Locate the `connect` mutation's `provider` input validator. It reads:

```typescript
z.enum(['google', 'facebook'])
```

Change to:

```typescript
z.enum(['google', 'facebook', 'bitrix'])
```

Locate the switch/if block that constructs `redirectUrl`. Add the `bitrix` case:

```typescript
case 'bitrix':
  redirectUrl = `${baseUrl}/api/oauth/bitrix`
  break
```

If the block uses if-else instead of switch, add the appropriate else-if branch.

This is the only edit to this router file in Phase 3. After Stage 0' commit, this file re-freezes.

**Acceptance:**
- [ ] `z.enum` includes `'bitrix'`
- [ ] `redirectUrl` construction handles the `'bitrix'` case
- [ ] `pnpm typecheck` passes

---

### 0'.9 — Add Bitrix24 mock OAuth routes

Create two new files. These are mock-only — no real Bitrix24 API calls.

**`src/app/api/oauth/bitrix/route.ts`:**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '~/server/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Generate a mock state token
  const state = crypto.randomUUID()
  // Immediately redirect to the mock callback with a fake code
  const callbackUrl = new URL('/api/oauth/bitrix/callback', req.url)
  callbackUrl.searchParams.set('code', `mock-bitrix-${crypto.randomUUID()}`)
  callbackUrl.searchParams.set('state', state)

  return NextResponse.redirect(callbackUrl)
}
```

**`src/app/api/oauth/bitrix/callback/route.ts`:**

```typescript
// MOCK ONLY — real Bitrix24 OAuth is Phase 4's job.
// This handler simulates the OAuth dance without hitting any real Bitrix24 endpoint.
import { NextResponse } from 'next/server'
import { auth } from '~/server/auth'
import { db } from '~/server/db'
import { encryptToken } from '~/lib/crypto'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code?.startsWith('mock-bitrix-')) {
    return NextResponse.redirect(
      new URL('/connections?error=bitrix_invalid_code', req.url)
    )
  }

  try {
    const encryptedToken = await encryptToken('MOCK_BITRIX_TOKEN_FROM_PHASE_3_UI')
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

    await db.oAuthConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'BITRIX24',
        },
      },
      update: {
        status: 'CONNECTED',
        accessToken: encryptedToken,
        email: 'mockuser@bitrix24.example.com',
        externalId: 'mock_bitrix_user_001',
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        provider: 'BITRIX24',
        status: 'CONNECTED',
        accessToken: encryptedToken,
        email: 'mockuser@bitrix24.example.com',
        externalId: 'mock_bitrix_user_001',
        expiresAt,
      },
    })

    return NextResponse.redirect(
      new URL('/connections?success=bitrix', req.url)
    )
  } catch (err) {
    console.error('[bitrix/callback] upsert failed:', err)
    return NextResponse.redirect(
      new URL('/connections?error=bitrix_upsert_failed', req.url)
    )
  }
}
```

**Note on `db.oAuthConnection`:** Check the Prisma client generated name — it may be `db.oAuthConnection` or `db.oauthConnection`. Read `src/server/db.ts` and `prisma/schema.prisma` to determine the correct casing. Match it exactly.

**Acceptance:**
- [ ] Both files exist at the specified paths
- [ ] Neither file makes external HTTP calls
- [ ] `encryptToken` is imported from `~/lib/crypto`
- [ ] `pnpm typecheck` passes on both files

---

### 0'.10 — Typecheck, lint, commit

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
Set-Location $root
pnpm prisma generate
pnpm typecheck
pnpm lint
git add prisma/schema.prisma `
    "prisma/migrations/" `
    src/styles/globals.css `
    src/lib/integration-icons.tsx `
    src/lib/modules.ts `
    src/server/mocks/types.ts `
    src/server/mocks/data.ts `
    src/server/api/routers/connections.ts `
    src/app/api/oauth/bitrix/route.ts `
    "src/app/api/oauth/bitrix/callback/route.ts"
git commit -m "phase 3 stage 0': bitrix24 enum + brand tokens + modules registry + mock OAuth + type unions + mock data migration"
```

---

### Stage 0' Acceptance Checklist (verify all before typing "go Stage 1")

- [ ] Branch `phase-3-ui` created from `phase-2`; `git branch --show-current` shows `phase-3-ui`
- [ ] Migration `add_bitrix24_provider` applied; file exists at `prisma/migrations/<timestamp>_add_bitrix24_provider/migration.sql`
- [ ] `BITRIX24` visible in Prisma `Provider` enum in `prisma/schema.prisma`
- [ ] `src/styles/globals.css` `@theme {}` contains `--color-bitrix-cyan: #2FC6F6` and `--color-watch-violet: #8b5cf6`
- [ ] `src/lib/integration-icons.tsx` exports `BitrixIcon`, `WatchIcon`; `getIntegrationMeta` handles both `bitrix.*` and `trigger.watch.*` prefixes
- [ ] `src/lib/modules.ts` has 13 new module entries + 2 new trigger entries; `outputsArray: true` on exactly: `fb.list_ad_accounts`, `fb.list_ads`, `sheets.find_rows`, `bitrix.find_leads`
- [ ] `src/server/mocks/types.ts` `ModuleType` union includes all new IDs; `'fb.account_insights'` removed; `outputsArray?: boolean` on definition type
- [ ] `src/server/mocks/data.ts` has Bitrix24 OAuthConnection row; no `'fb.account_insights'` strings remaining
- [ ] `src/server/api/routers/connections.ts` `z.enum` includes `'bitrix'`; redirect URL constructed
- [ ] `src/app/api/oauth/bitrix/route.ts` exists; mock-only; no external calls
- [ ] `src/app/api/oauth/bitrix/callback/route.ts` exists; uses `encryptToken`; redirects to `/connections?success=bitrix`
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm dev` starts without errors; `/connections` still loads
- [ ] One commit at HEAD of `phase-3-ui`

**HARD STOP. Wait for human to reply "go Stage 1" before dispatching any subagent.**

---

## Stage 1' — 3 Parallel Subagents (~4–5 hr, all in worktrees)

### Worktree setup (orchestrator runs this after "go Stage 1" confirmation)

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree add .worktrees/forms   phase3/module-forms
git -C $root worktrees add .worktrees/bitrix  phase3/bitrix-brand
git -C $root worktree add .worktrees/builder phase3/builder-iterators
```

Dispatch all 3 subagents in parallel immediately after worktrees are created.

**Merge order enforced by orchestrator in Stage 2':** forms (A) first, bitrix (B) second, builder (C) last.

---

### Agent A — `Module-Forms-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\forms`
**Branch:** `phase3/module-forms`

#### Files You OWN (exclusive write)

```
src/components/scenarios/builder/modules/FbListAdAccountsConfig.tsx     (NEW)
src/components/scenarios/builder/modules/FbListAdsConfig.tsx            (NEW)
src/components/scenarios/builder/modules/FbGetAdConfig.tsx              (NEW)
src/components/scenarios/builder/modules/SheetsFindRowsConfig.tsx       (NEW)
src/components/scenarios/builder/modules/SheetsUpdateRowConfig.tsx      (NEW)
src/components/scenarios/builder/modules/SheetsDeleteRowConfig.tsx      (NEW)
src/components/scenarios/builder/modules/SheetsGetRowConfig.tsx         (NEW)
src/components/scenarios/builder/modules/SheetsCreateTabConfig.tsx      (NEW)
src/components/scenarios/builder/modules/BitrixCreateLeadConfig.tsx     (NEW)
src/components/scenarios/builder/modules/BitrixUpdateLeadConfig.tsx     (NEW)
src/components/scenarios/builder/modules/BitrixFindLeadsConfig.tsx      (NEW)
src/components/scenarios/builder/modules/BitrixCreateDealConfig.tsx     (NEW)
src/components/scenarios/builder/modules/BitrixUpdateDealConfig.tsx     (NEW)
src/components/scenarios/builder/modules/BitrixCreateSmartProcessItemConfig.tsx (NEW)
src/components/scenarios/builder/StepCard.tsx    (EDIT — MODULE_CONFIG_MAP entries ONLY)
```

#### Files You May READ (do not write)

```
src/lib/integration-icons.tsx
src/lib/modules.ts
src/server/mocks/types.ts
src/components/ui/*
src/components/scenarios/builder/modules/ModuleConfigShell.tsx
src/components/scenarios/builder/modules/FieldMappingPicker.tsx
src/components/scenarios/builder/modules/ScheduleConfig.tsx
src/components/scenarios/builder/StepCard.tsx    (read before editing)
```

#### Files You Must NOT Touch

- `src/components/scenarios/builder/modules/WatchSheetsNewRowsConfig.tsx` — **owned by Agent C**
- `src/components/scenarios/builder/modules/WatchBitrixNewLeadConfig.tsx` — **owned by Agent C**
- `src/components/scenarios/builder/ModuleLibraryModal.tsx` — **Agent C**
- `src/components/scenarios/builder/modules/FieldMappingPicker.tsx` — **Agent C** (read-only for A)
- `src/components/connections/*` — **Agent B**
- The renderer wrapper logic in `StepCard.tsx` — **Agent C's zone**

#### The StepCard MODULE_CONFIG_MAP protocol

Read `StepCard.tsx` in full. Find the section that maps `ModuleType` to a config component. It may be an inline switch, if-chain, or already a map object. **Refactor to a `MODULE_CONFIG_MAP` lookup object** if not already done:

```typescript
// Near the top of StepCard.tsx (module level, before the component):
const MODULE_CONFIG_MAP: Partial<Record<ModuleType, React.ComponentType<StepConfigProps>>> = {
  // --- existing entries (read from file and preserve them all) ---
  'trigger.schedule':    ScheduleConfig,
  'trigger.manual':      ManualConfig,
  // ... (all currently existing entries) ...

  // --- Agent A adds these 14 NEW entries: ---
  'fb.list_ad_accounts': FbListAdAccountsConfig,
  'fb.list_ads':         FbListAdsConfig,
  'fb.get_ad':           FbGetAdConfig,
  'sheets.find_rows':    SheetsFindRowsConfig,
  'sheets.update_row':   SheetsUpdateRowConfig,
  'sheets.delete_row':   SheetsDeleteRowConfig,
  'sheets.get_row':      SheetsGetRowConfig,
  'sheets.create_tab':   SheetsCreateTabConfig,
  'bitrix.create_lead':  BitrixCreateLeadConfig,
  'bitrix.update_lead':  BitrixUpdateLeadConfig,
  'bitrix.find_leads':   BitrixFindLeadsConfig,
  'bitrix.create_deal':  BitrixCreateDealConfig,
  'bitrix.update_deal':  BitrixUpdateDealConfig,
  'bitrix.create_smart_process_item': BitrixCreateSmartProcessItemConfig,
}
```

The renderer logic that reads from `MODULE_CONFIG_MAP` is Agent C's zone. Do NOT change any code outside of the map object and its import statements.

---

#### Task A.1 — `FbListAdAccountsConfig.tsx`

No config fields. Show only a description strip and Sample tab.

**ASCII mockup:**
```
+---------------------------------------------------------+
| [info] This module requires no configuration.           |
|   It returns all ad accounts accessible to the          |
|   connected Facebook user.                              |
|                                                         |
| --- Sample ------------------------------------------   |
| id               name           currency  status        |
| act_111111111    Acme Corp Ads  USD       ACTIVE        |
| act_222222222    Test Account   EUR       PAUSED        |
| act_333333333    Brand B        USD       ACTIVE        |
+---------------------------------------------------------+
```

**Inline help text (always visible, not tooltip):** "Returns up to 25 ad accounts. Real data requires a connected Facebook account (Phase 4)."

**Validation:** None.

**Acceptance criteria:**
- [ ] No-config notice renders
- [ ] Sample tab shows 3-row mini-table from `MODULES['fb.list_ad_accounts'].sampleOutput`
- [ ] `pnpm typecheck` passes in worktree

---

#### Task A.2 — `FbListAdsConfig.tsx`

Fields: `fbAccountId` (required), `campaignId` (optional text), `status` (optional select with 4 options).

**ASCII mockup:**
```
+---------------------------------------------------------+
|  Ad Account ID *                                        |
|  [_______________________________________]              |
|  Format: act_XXXXXXXXX - find in Ads Manager            |
|                                                         |
|  Campaign ID                                            |
|  [_______________________________________]              |
|  Leave blank to return ads from all campaigns           |
|                                                         |
|  Status filter                                          |
|  [All statuses v]                                       |
|                                                         |
|  --- Sample ------------------------------------------  |
|  id     name                 status   campaign_id       |
|  23001  Summer promo - A     ACTIVE   9001              |
|  23002  Summer promo - B     PAUSED   9001              |
|  23003  Retargeting - CTA    ACTIVE   9002              |
+---------------------------------------------------------+
```

**Validation:** `fbAccountId` required — show inline error "Ad Account ID is required", red border on input.

**Acceptance criteria:**
- [ ] 3 fields render; status select has 4 options
- [ ] Required validation fires on `fbAccountId`
- [ ] Sample tab shows 3 rows
- [ ] `pnpm typecheck` passes

---

#### Task A.3 — `FbGetAdConfig.tsx`

Single field: `adId` (required).

**Validation:** `adId` required.

**Sample tab:** 1 row from `MODULES['fb.get_ad'].sampleOutput`.

**Acceptance criteria:**
- [ ] Single input renders with help text
- [ ] Required validation works
- [ ] Sample tab renders
- [ ] `pnpm typecheck` passes

---

#### Task A.4 — `SheetsFindRowsConfig.tsx`

Fields: `spreadsheetId`, `tabName`, `searchColumn`, `searchValue` — all required.

**Validation:** All 4 required.

**Sample tab:** 3 rows.

**Acceptance criteria:**
- [ ] 4 fields render
- [ ] All 4 required validations fire
- [ ] Sample tab shows 3 rows
- [ ] `pnpm typecheck` passes

---

#### Task A.5 — `SheetsUpdateRowConfig.tsx`

Fields: `spreadsheetId` (required), `tabName` (required), `rowIdentifier` (required), `mappedFields` (FieldMappingPicker, required).

**Note:** Use the existing `FieldMappingPicker` component. Read its prop signature before calling it.

**Validation:** First 3 fields required.

**Acceptance criteria:**
- [ ] 3 text fields + FieldMappingPicker render
- [ ] Required validations work
- [ ] Sample tab renders
- [ ] `pnpm typecheck` passes

---

#### Task A.6 — `SheetsDeleteRowConfig.tsx`

Fields: `spreadsheetId`, `tabName`, `rowIdentifier` — all required.

**Destructive-action warning banner:**
```
bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800
rounded-md p-3 text-sm text-amber-800 dark:text-amber-200
```
Text: "This action cannot be undone. The row will be permanently removed from the sheet."

**Acceptance criteria:**
- [ ] 3 fields + amber warning banner render
- [ ] Required validations work
- [ ] `pnpm typecheck` passes

---

#### Task A.7 — `SheetsGetRowConfig.tsx`

Fields: `spreadsheetId`, `tabName`, `rowIndex` (number) — all required.

**Validation:** `rowIndex` must be an integer >= 2. Error text: "Row index must be 2 or higher (row 1 is the header row)".

**Acceptance criteria:**
- [ ] 3 fields render
- [ ] `rowIndex` < 2 shows inline error
- [ ] `pnpm typecheck` passes

---

#### Task A.8 — `SheetsCreateTabConfig.tsx`

Fields: `spreadsheetId` (required), `newTabName` (required), `headerRow` (optional text).

**Validation:** `spreadsheetId` and `newTabName` required. If `newTabName` contains `/`, `[`, `]`, `*`, `?`, `:`, or `\`, show inline error: "Tab name contains invalid characters ( / [ ] * ? : \\ )".

**Acceptance criteria:**
- [ ] 3 fields render
- [ ] Required + character validation work
- [ ] `pnpm typecheck` passes

---

#### Task A.9 — `BitrixCreateLeadConfig.tsx`

Fields: `title` (required), `name` (required), `lastName` (optional), `phone` (optional), `email` (optional), `sourceId` (required select, 4 options), `comments` (optional textarea).

**Layout:** `title` full-width. `name` + `lastName` in `grid grid-cols-2 gap-3`. `phone` + `email` in `grid grid-cols-2 gap-3`. `sourceId` full-width select. `comments` full-width textarea.

**ASCII mockup:**
```
+---------------------------------------------------------+
|  Lead title *                                           |
|  [_______________________________________]              |
|  Short title (e.g. "Website inquiry - Alice")           |
|                                                         |
|  First name *         Last name                         |
|  [________________]   [__________________]              |
|                                                         |
|  Phone                Email                             |
|  [________________]   [__________________]              |
|                                                         |
|  Source *                                               |
|  [Website v]                                            |
|                                                         |
|  Comments                                               |
|  [_______________________________________]  (textarea)  |
+---------------------------------------------------------+
```

**Validation:** `title`, `name`, `sourceId` required.

**Acceptance criteria:**
- [ ] 2-column grid layout for name + phone pairs
- [ ] Source select has 4 options (Website, Inbound call, Email, Other)
- [ ] 3 required validations fire
- [ ] `pnpm typecheck` passes

---

#### Task A.10 — `BitrixUpdateLeadConfig.tsx`

Fields: `leadId` (required), `title` (optional), `statusId` (optional select, 5 options incl. "No change"), `comments` (optional textarea).

**Validation:** `leadId` required.

**Acceptance criteria:**
- [ ] Status select has 5 options including "No change"
- [ ] Required validation works
- [ ] `pnpm typecheck` passes

---

#### Task A.11 — `BitrixFindLeadsConfig.tsx`

Fields: `filterField` (required select, 4 options), `filterValue` (required), `limit` (optional number).

**Validation:** `filterField` and `filterValue` required. `limit` must be positive integer <= 50 if provided.

**Sample tab:** 3 rows.

**Acceptance criteria:**
- [ ] Filter field select has 4 options (Email, Phone, Status, Source)
- [ ] Required + limit validations work
- [ ] Sample tab shows 3 rows
- [ ] `pnpm typecheck` passes

---

#### Task A.12 — `BitrixCreateDealConfig.tsx`

Fields: `title` (required), `categoryId` + `stageId` (both required, grid row), `opportunity` + `currency` (both optional, grid row), `contactId` (optional).

**Layout:** `title` full-width. `categoryId` + `stageId` in `grid grid-cols-2 gap-3`. `opportunity` + `currency` in `grid grid-cols-2 gap-3`. `contactId` full-width.

**Validation:** `title`, `categoryId`, `stageId` required.

**Acceptance criteria:**
- [ ] Grid layout for paired fields renders
- [ ] 3 required validations work
- [ ] `pnpm typecheck` passes

---

#### Task A.13 — `BitrixUpdateDealConfig.tsx`

Fields: `dealId` (required), `stageId` (optional), `opportunity` (optional number), `comments` (optional textarea).

**Validation:** `dealId` required.

**Acceptance criteria:**
- [ ] 4 fields render
- [ ] Required validation works
- [ ] `pnpm typecheck` passes

---

#### Task A.14 — `BitrixCreateSmartProcessItemConfig.tsx`

Fields: `entityTypeId` (required), `title` (required), `stageId` (optional), `fields` (FieldMappingPicker, optional).

**Info notice** at bottom: slate/blue info box — "Smart Process Items are Bitrix24's flexible custom CRM entity primitive. They extend beyond standard leads and deals with custom fields and workflows."

**Validation:** `entityTypeId`, `title` required.

**Acceptance criteria:**
- [ ] 3 text fields + FieldMappingPicker + info notice render
- [ ] Required validations work
- [ ] `pnpm typecheck` passes

---

#### Task A.15 — StepCard `MODULE_CONFIG_MAP` update

Update `src/components/scenarios/builder/StepCard.tsx`:
1. Add 14 import statements for the new config components
2. Add 14 entries to `MODULE_CONFIG_MAP` (or refactor to map first as described in the protocol above)
3. Do NOT modify any renderer logic or iterator badge logic — those are Agent C's zone

**Acceptance criteria:**
- [ ] 14 new imports present
- [ ] 14 new entries in `MODULE_CONFIG_MAP`
- [ ] No edits to renderer wrapper or badge logic
- [ ] `pnpm typecheck` passes in `.worktrees/forms`

---

#### Agent A — Final report

1. All 14 new files written (absolute paths)
2. Tasks A.1–A.15 completed/skipped status
3. `pnpm typecheck` pass confirmation in `.worktrees/forms`
4. Screenshots at `.agent-output/module-forms-light.png` and `.agent-output/module-forms-dark.png` at 1440x900 showing `BitrixCreateLeadConfig` expanded (most fields)

---

### Agent B — `Bitrix-Brand-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\bitrix`
**Branch:** `phase3/bitrix-brand`

#### Files You OWN (exclusive write)

```
src/components/connections/cards/BitrixConnectionCard.tsx   (NEW)
src/components/connections/cards/index.ts                   (NEW - barrel export)
src/components/connections/ConnectionsClient.tsx            (EDIT)
src/components/connections/ConnectionCard.tsx               (EDIT)
```

#### Files You May READ (do not write)

```
src/lib/integration-icons.tsx
src/styles/globals.css
src/server/mocks/data.ts
src/server/api/routers/connections.ts
src/components/ui/*
src/components/connections/ConnectionCard.tsx    (read before editing)
src/components/connections/ConnectionsClient.tsx (read before editing)
```

#### Files You Must NOT Touch

- Any file in `src/components/scenarios/builder/` — Agents A and C
- `src/app/api/oauth/bitrix/*` — frozen after Stage 0'
- `prisma/schema.prisma` — frozen after Stage 0'

---

#### Task B.1 — `BitrixConnectionCard.tsx`

Model after existing connection cards. Support three statuses: CONNECTED, DISCONNECTED, EXPIRED.

**Connected state:**
```
+------------------------------------------------------------+
| [B24 cyan 36x36]  Bitrix24 CRM                             |
|                    Automate leads, deals, and smart        |
|                    process items in your Bitrix24 org      |
|                                                            |
|  check Connected . mockuser@bitrix24.example.com           |
|  Connected May 11, 2025                  [Disconnect]      |
+------------------------------------------------------------+
```

**Disconnected state:**
```
|  circle Disconnected                                       |
|                              [Connect Bitrix24]            |
```

**Expired state:**
```
|  warning Session expired - reconnect required              |
|                              [Reconnect Bitrix24]          |
```

**Brand tile:** `h-9 w-9 rounded-lg bg-bitrix-cyan/10 flex items-center justify-center` with `<BitrixIcon className="h-5 w-5 text-bitrix-cyan" />`.

**Status icons:**
- CONNECTED: lucide `CheckCircle` `text-green-500`
- DISCONNECTED: lucide `Circle` `text-slate-400`
- EXPIRED: lucide `AlertCircle` `text-amber-500`

**Connect button:** calls `connections.connect` tRPC mutation with `{ provider: 'bitrix' }`. Shows loading spinner while pending.

**Disconnect button:** shows confirmation popover before calling `connections.disconnect`. Popover text: "This will disconnect Bitrix24. Running scenarios that use Bitrix modules will fail. Continue?" with Confirm and Cancel buttons.

**Props:**
```typescript
interface BitrixConnectionCardProps {
  connection: OAuthConnection | null
  onConnect: () => void
  onDisconnect: () => void
}
```

**Acceptance criteria:**
- [ ] All 3 states render correctly
- [ ] Brand tile uses Tailwind `bitrix-cyan` tokens
- [ ] Connect triggers mock OAuth (loading state visible)
- [ ] Disconnect confirmation popover works
- [ ] All interactive elements keyboard-accessible
- [ ] `pnpm typecheck` passes in `.worktrees/bitrix`

---

#### Task B.2 — `ConnectionsClient.tsx` — three-card empty state + toast strings

Read the existing file in full before editing.

**Edit 1 — Empty state:** Add Bitrix24 as the third CTA. The empty state now shows 3 cards:
```
[Sheets CTA]   [Facebook CTA]   [Bitrix24 CTA]
```
Layout: `grid grid-cols-1 sm:grid-cols-3 gap-4`

Bitrix24 CTA card: same visual pattern as existing CTAs but with Bitrix24 brand colors. "Connect Bitrix24" button calls `connections.connect` with `provider: 'bitrix'`.

**Edit 2 — Toast strings:** Add to the existing success/error handler:

```typescript
// Success:
'bitrix' -> toast.success('Bitrix24 connected successfully')

// Errors:
'bitrix_invalid_code'  -> toast.error('Bitrix24 connection failed: invalid authorization code')
'bitrix_upsert_failed' -> toast.error('Bitrix24 connection failed: could not save credentials')
```

**Acceptance criteria:**
- [ ] Empty state shows 3 CTA cards
- [ ] `?success=bitrix` produces success toast
- [ ] `?error=bitrix_invalid_code` produces error toast
- [ ] `?error=bitrix_upsert_failed` produces error toast
- [ ] `pnpm typecheck` passes

---

#### Task B.3 — `ConnectionCard.tsx` — route by provider

Read the existing file. Add provider routing at the top of the render:

```typescript
if (connection.provider === 'BITRIX24') {
  return (
    <BitrixConnectionCard
      connection={connection}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  )
}
// existing generic rendering for GOOGLE_SHEETS and FACEBOOK continues below
```

Import `BitrixConnectionCard` from `./cards/BitrixConnectionCard`.

**Acceptance criteria:**
- [ ] Bitrix24 connections render branded card
- [ ] Google Sheets and Facebook connections unchanged
- [ ] `pnpm typecheck` passes

---

#### Task B.4 — `cards/index.ts` barrel export

```typescript
export { BitrixConnectionCard } from './BitrixConnectionCard'
```

**Acceptance criteria:**
- [ ] File exists with correct export
- [ ] `pnpm typecheck` passes

---

#### Agent B — Final report

1. 4 files written/edited (absolute paths)
2. Tasks B.1–B.4 completed/skipped
3. `pnpm typecheck` pass in `.worktrees/bitrix`
4. Screenshots at `.agent-output/bitrix-brand-connected-light.png` and `.agent-output/bitrix-brand-disconnected-dark.png` at 1440x900 showing `/connections` page

---

### Agent C — `Builder-Iterators-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\builder`
**Branch:** `phase3/builder-iterators`

#### Files You OWN (exclusive write)

```
src/components/scenarios/builder/IteratorBadge.tsx             (NEW)
src/components/scenarios/builder/stepUtils.ts                  (NEW)
src/components/scenarios/builder/modules/WatchSheetsNewRowsConfig.tsx  (NEW)
src/components/scenarios/builder/modules/WatchBitrixNewLeadConfig.tsx  (NEW)
src/components/scenarios/builder/StepCard.tsx             (EDIT - renderer wrapper + badge only)
src/components/scenarios/builder/modules/FieldMappingPicker.tsx (EDIT - item. prefix)
src/components/scenarios/builder/ModuleLibraryModal.tsx   (EDIT - Bitrix24 section + Watch subgroup)
src/components/scenarios/builder/modules/ModuleConfigShell.tsx (EDIT - badge in expanded header)
src/components/scenarios/builder/TestRunPanel.tsx         (EDIT - iterator copy)
```

#### Files You May READ (do not write)

```
src/lib/integration-icons.tsx
src/lib/modules.ts
src/server/mocks/types.ts
src/components/ui/*
src/components/scenarios/builder/modules/*   (read-only; Agent A owns the new *Config files)
src/components/scenarios/builder/ScenarioBuilder.tsx   (read-only; to understand step props)
```

#### Files You Must NOT Touch

- Any file in `src/components/connections/` — Agent B
- The `MODULE_CONFIG_MAP` entries in `StepCard.tsx` — Agent A's zone; do not add or remove map entries
- Any `*Config.tsx` except `WatchSheetsNewRowsConfig.tsx` and `WatchBitrixNewLeadConfig.tsx`

---

#### Task C.1 — `IteratorBadge.tsx` and `stepUtils.ts`

**`src/components/scenarios/builder/IteratorBadge.tsx`:**

```typescript
import { RefreshCw } from 'lucide-react'
import { cn } from '~/lib/utils'

interface IteratorBadgeProps {
  /** Number of times the step will run (from upstream sampleOutput.length) */
  runCount?: number
  className?: string
}

export function IteratorBadge({ runCount, className }: IteratorBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium',
        'bg-slate-100 dark:bg-slate-800',
        'text-slate-600 dark:text-slate-300',
        className,
      )}
      title="This step runs once per item from the upstream list"
    >
      <RefreshCw className="h-3 w-3" aria-hidden="true" />
      <span>Iterates per item</span>
      {runCount !== undefined && (
        <span className="text-slate-400 dark:text-slate-500">
          {' '}&middot; will run {runCount}&times;
        </span>
      )}
    </span>
  )
}
```

**`src/components/scenarios/builder/stepUtils.ts`:**

```typescript
import type { ModuleType } from '~/server/mocks/types'
import { MODULES } from '~/lib/modules'

/** Returns true when the given module type produces an array of items as output. */
export function moduleProducesArray(moduleType: ModuleType): boolean {
  const module = MODULES[moduleType as keyof typeof MODULES]
  return module?.outputsArray === true
}

/** Returns the sampleOutput length for a module, used to compute iterator run count. */
export function moduleSampleOutputLength(moduleType: ModuleType): number {
  const module = MODULES[moduleType as keyof typeof MODULES]
  return Array.isArray(module?.sampleOutput) ? module.sampleOutput.length : 1
}
```

**Acceptance criteria:**
- [ ] `IteratorBadge` renders "Iterates per item" alone and with "will run N x" variant
- [ ] `title` attribute and `aria-hidden` present for accessibility
- [ ] Both helpers exported from `stepUtils.ts`
- [ ] `pnpm typecheck` passes

---

#### Task C.2 — `StepCard.tsx` — iterator badge in collapsed header

Read `StepCard.tsx` in full. Locate the renderer wrapper (the code that calls `MODULE_CONFIG_MAP[step.moduleType]`). Do NOT modify the map itself.

Identify how the component receives context about adjacent steps. It likely gets `steps: DraftStep[]` and `step: DraftStep`. Derive `previousStep` as:
```typescript
const previousStep = steps.find(s => s.position === step.position - 1)
```

Add to the collapsed card header JSX, after the module name/summary line:
```tsx
{previousStep && moduleProducesArray(previousStep.moduleType) && (
  <IteratorBadge
    runCount={moduleSampleOutputLength(previousStep.moduleType)}
    className="ml-2 shrink-0"
  />
)}
```

Import `IteratorBadge`, `moduleProducesArray`, `moduleSampleOutputLength` from the files created in C.1.

If `steps` array is not currently passed to `StepCard`, read `ScenarioBuilder.tsx` to see how it renders step cards and add the `steps` prop to `StepCardProps`.

**Acceptance criteria:**
- [ ] Iterator badge visible in collapsed card when previous step has `outputsArray: true`
- [ ] Badge shows correct count
- [ ] No badge on position 1 (trigger)
- [ ] No badge when previous step does not produce array
- [ ] `pnpm typecheck` passes

---

#### Task C.3 — `ModuleLibraryModal.tsx` — Bitrix24 section + Watch subgroup

Read the full existing modal file. It has Triggers, Facebook, Google Sheets sections.

**Changes needed:**

1. Inside Triggers section: add a horizontal divider labelled "Watch" after Schedule + Manual cards and before the 2 new Watch trigger entries (`trigger.watch.sheets_new_rows`, `trigger.watch.bitrix_new_lead`).

Watch subgroup divider JSX:
```tsx
<div className="flex items-center gap-2 my-3">
  <div className="h-px flex-1 bg-border" />
  <span className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wide">
    Watch
  </span>
  <div className="h-px flex-1 bg-border" />
</div>
```

2. Google Sheets section: add 6 new module cards for `sheets.find_rows`, `sheets.update_row`, `sheets.delete_row`, `sheets.get_row`, `sheets.create_tab`, `sheets.watch_new_rows`.

3. Add new Bitrix24 section after Google Sheets section, using the same section header pattern as existing sections. Use `BitrixIcon`, `bg-bitrix-cyan/10`, `text-bitrix-cyan`. Include 6 module cards for all `bitrix.*` modules.

**Search filter behaviour:** When search is active:
- Watch subgroup divider hides if both Watch trigger cards are filtered out
- Triggers section header hides if all 4 triggers are filtered out (Schedule, Manual, both Watch)
- Bitrix24 section hides completely if all 6 Bitrix24 modules are filtered out

**Acceptance criteria:**
- [ ] Triggers section has Watch subgroup with exactly 2 entries
- [ ] Google Sheets section shows 8 module cards total
- [ ] New Bitrix24 section shows 6 module cards with cyan brand colors
- [ ] Search correctly filters all sections and subsections
- [ ] Watch subgroup divider hides when both entries are filtered
- [ ] `pnpm typecheck` passes

---

#### Task C.4 — `FieldMappingPicker.tsx` — `item.` prefix for iterator upstream

Read the existing component fully. Understand how it reads upstream fields.

Add iterator-aware field prefixing:

```typescript
import { moduleProducesArray } from '~/components/scenarios/builder/stepUtils'

// Inside the component, when computing field options:
const prevStep = steps.find(s => s.position === step.position - 1)
const isIterator = prevStep ? moduleProducesArray(prevStep.moduleType) : false

// Map field options:
const displayFields = rawFields.map(field => ({
  ...field,
  key: isIterator ? `item.${field.key}` : field.key,
  label: isIterator ? `item.${field.label}` : field.label,
}))
```

Add a visible context notice above the field list when `isIterator` is true:
```tsx
{isIterator && (
  <p className="text-xs text-muted-foreground mb-2 px-1">
    Fields are prefixed with <code className="text-xs bg-muted px-1 rounded">item.</code> — this step runs once per row from the upstream list.
  </p>
)}
```

**Acceptance criteria:**
- [ ] When previous step is `fb.list_ads`, fields show as `item.id`, `item.name`, etc.
- [ ] When previous step does not produce array, no prefix
- [ ] Iterator context notice visible above field list when relevant
- [ ] `pnpm typecheck` passes

---

#### Task C.5 — `WatchSheetsNewRowsConfig.tsx`

Fields: `spreadsheetId`, `tabName`, `watchColumn` — all required.

**Blue polling-info banner:**
```
bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800
rounded-md p-3 text-sm text-blue-800 dark:text-blue-200
```
Text: "Polling interval: every 5 minutes. Real polling is wired in Phase 4."

**ASCII mockup:**
```
+---------------------------------------------------------+
|  Spreadsheet ID *                                       |
|  [_______________________________________]              |
|  The ID from your Google Sheets URL                     |
|                                                         |
|  Tab name *                                             |
|  [_______________________________________]              |
|  Name of the sheet tab to watch (e.g. "Sheet1")         |
|                                                         |
|  Watch column *                                         |
|  [_______________________________________]              |
|  Column header used to detect new rows (e.g. "id").     |
|  Values in this column must be unique per row.          |
|                                                         |
|  [i] Polling interval: every 5 minutes.                 |
|      Real polling is wired in Phase 4.                  |
|                                                         |
|  --- Sample ------------------------------------------  |
|  row  id   name          email             createdAt    |
|  14   99   New Contact   new@example.com   2025-05-11   |
+---------------------------------------------------------+
```

**Validation:** All 3 fields required.

**Acceptance criteria:**
- [ ] 3 fields + blue polling-info banner render
- [ ] Required validations work
- [ ] Sample tab renders
- [ ] `pnpm typecheck` passes

---

#### Task C.6 — `WatchBitrixNewLeadConfig.tsx`

Fields: `pipeline` (optional), `filterField` (optional select, 3 options), `filterValue` (optional text — required when filterField is not empty).

**Blue polling-info banner** (same style as C.5).

**Conditional validation:** `filterValue` is required only when `filterField` is not empty string.

**ASCII mockup:**
```
+---------------------------------------------------------+
|  Pipeline                                               |
|  [_______________________________________]              |
|  Filter by pipeline name (blank = all pipelines)        |
|                                                         |
|  Filter field                                           |
|  [Any new lead v]                                       |
|                                                         |
|  Filter value                                           |
|  [_______________________________________]              |
|  Required when a filter field is selected               |
|                                                         |
|  [i] Polling interval: every 5 minutes.                 |
|      Real polling is wired in Phase 4.                  |
|                                                         |
|  --- Sample ------------------------------------------  |
|  id        title              status  createdAt         |
|  lead_099  New website lead   NEW     2025-05-11        |
+---------------------------------------------------------+
```

**Acceptance criteria:**
- [ ] 3 fields + blue info banner render
- [ ] `filterValue` conditional validation works
- [ ] Sample tab renders
- [ ] `pnpm typecheck` passes

---

#### Task C.7 — `ModuleConfigShell.tsx` — iterator badge in expanded header

Read the existing file. Locate where the expanded card header renders the module name.

Add `previousStep?: DraftStep` to props if not already present. Add badge adjacent to module name:

```tsx
{previousStep && moduleProducesArray(previousStep.moduleType) && (
  <IteratorBadge
    runCount={moduleSampleOutputLength(previousStep.moduleType)}
    className="ml-2"
  />
)}
```

**Acceptance criteria:**
- [ ] Badge visible in expanded header when upstream step produces array
- [ ] Consistent with collapsed card badge (same `IteratorBadge` component)
- [ ] `pnpm typecheck` passes

---

#### Task C.8 — `TestRunPanel.tsx` — iterator-aware copy

Read the existing `TestRunPanel`. When displaying a step's result, check whether the previous step produces an array. If so, add this block above the step result:

```tsx
{prevStep && moduleProducesArray(prevStep.moduleType) && (
  <div className="text-xs text-muted-foreground border-l-2 border-slate-200 pl-3 mb-2">
    <span className="flex items-center gap-1">
      <RefreshCw className="h-3 w-3" aria-hidden="true" />
      Iterates per item from Step {prevStep.position} ({MODULES[prevStep.moduleType]?.shortName})
    </span>
    <span>Will run {moduleSampleOutputLength(prevStep.moduleType)} times during a real execution.</span>
    <span className="text-slate-400">Showing result for first item (item[0]) below.</span>
  </div>
)}
```

**Acceptance criteria:**
- [ ] Iterator copy visible when upstream step iterates
- [ ] Count derived from `MODULES[upstream].sampleOutput.length`
- [ ] Non-iterator steps show no additional copy
- [ ] `pnpm typecheck` passes

---

#### Agent C — Final report

1. All files written/edited (absolute paths)
2. Tasks C.1–C.8 completed/skipped
3. `pnpm typecheck` pass in `.worktrees/builder`
4. Screenshots at `.agent-output/builder-iterators-light.png` and `.agent-output/builder-iterators-dark.png` at 1440x900 showing a scenario with `fb.list_ads` at step 2 and `bitrix.create_lead` at step 3, iterator badge visible

---

## Stage 2' — Merge + QA + Screenshots (Orchestrator, ~30 min)

> Run only after all 3 subagents have committed and each has confirmed `pnpm typecheck` passes in its worktree.

### 2'.1 — Merge order

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root checkout phase-3-ui

git -C $root merge --no-ff phase3/module-forms      -m "merge: Agent A - 14 new module config forms"
git -C $root merge --no-ff phase3/bitrix-brand      -m "merge: Agent B - Bitrix24 brand connections card"
git -C $root merge --no-ff phase3/builder-iterators -m "merge: Agent C - iterator UI + Watch triggers + library modal"
```

If any merge conflict arises, identify the conflicting file:
1. `StepCard.tsx` with map entries — Agent A owns those; revert Agent C's change to that section.
2. `StepCard.tsx` with renderer wrapper — Agent C owns that; revert Agent A's change to that section.
3. Any other file — investigate which agent wrote outside its assigned scope. Surface to human before proceeding.

**Do not auto-resolve conflicts. Ask the human.**

### 2'.2 — Typecheck and lint

```powershell
pnpm typecheck
pnpm lint
```

Zero errors, zero warnings from lint that weren't present before. Fix all issues before proceeding.

### 2'.3 — Existing tests

```powershell
pnpm test
```

All 14 existing tests must pass. If any regress, fix in `phase-3-ui` directly.

### 2'.4 — Smoke test all routes

```
/                          -> redirects (no regression)
/login                     -> renders (no regression)
/connections               -> shows 3 cards or 3 CTAs for Sheets, Facebook, Bitrix24 [NEW]
/scenarios                 -> list renders (no regression)
/scenarios/new             -> template picker renders (no regression)
/scenarios/scn_custom_01   -> builder renders; no broken moduleType refs [VERIFY]
/runs                      -> renders (no regression)
/settings                  -> renders (no regression)
```

**Phase 3 specific checks (must verify manually):**
- [ ] `/connections` shows Bitrix24 card in disconnected state
- [ ] Click "Connect Bitrix24" -> loading state -> redirect -> `/connections?success=bitrix` -> success toast -> card shows Connected
- [ ] Click "Disconnect" on Bitrix24 card -> confirmation popover -> on Confirm, card returns to Disconnected
- [ ] Open Module Library on any scenario -> Triggers section has Watch subgroup with 2 entries
- [ ] Google Sheets section in Module Library has 8 module cards
- [ ] New Bitrix24 section in Module Library has 6 module cards with cyan brand
- [ ] Add `fb.list_ads` step; add `bitrix.create_lead` step -> iterator badge appears on Bitrix24 card
- [ ] Open `bitrix.create_lead` expanded config -> iterator badge visible in expanded header
- [ ] Open FieldMappingPicker on `bitrix.create_lead` -> fields prefixed with `item.`
- [ ] Open `WatchSheetsNewRowsConfig` -> 3 fields + blue polling banner + sample tab
- [ ] Open `WatchBitrixNewLeadConfig` -> 3 fields + blue polling banner + conditional validation
- [ ] Open `SheetsDeleteRowConfig` -> amber warning banner visible
- [ ] Open `SheetsCreateTabConfig` -> enter invalid tab name char -> inline error fires
- [ ] Open `SheetsGetRowConfig` -> enter rowIndex=1 -> error "Row index must be 2 or higher"
- [ ] Open `FbListAdAccountsConfig` -> shows no-config notice (no input fields) + sample tab
- [ ] Run Test on scenario with iterator step -> TestRunPanel shows "Iterates per item" copy

### 2'.5 — Accessibility check

```powershell
pnpm dlx @axe-core/cli http://localhost:3000/connections
pnpm dlx @axe-core/cli http://localhost:3000/scenarios/scn_custom_01
```

Zero critical or serious violations. Fix before tagging.

### 2'.6 — Lighthouse

Performance >= 90, Accessibility >= 95, Best Practices >= 90 on `/connections` and `/scenarios/scn_custom_01`, in both light and dark mode.

### 2'.7 — Before/After screenshots

```powershell
New-Item -ItemType Directory -Force -Path docs/screenshots/phase3-ui/before-after
```

Capture at 1440x900 in light and dark mode:
```
docs/screenshots/phase3-ui/before-after/connections-after-light.png
docs/screenshots/phase3-ui/before-after/connections-after-dark.png
docs/screenshots/phase3-ui/before-after/builder-iterator-after-light.png
docs/screenshots/phase3-ui/before-after/builder-iterator-after-dark.png
docs/screenshots/phase3-ui/before-after/module-library-after-light.png
docs/screenshots/phase3-ui/before-after/module-library-after-dark.png
```

```powershell
git -C $root add docs/screenshots/phase3-ui/
git -C $root commit -m "docs: Phase 3 UI before/after screenshots"
```

### 2'.8 — Collect agent output screenshots

```powershell
New-Item -ItemType Directory -Force -Path docs/screenshots/phase3-ui/agent-output
Copy-Item .worktrees/forms/.agent-output/*.png   docs/screenshots/phase3-ui/agent-output/
Copy-Item .worktrees/bitrix/.agent-output/*.png  docs/screenshots/phase3-ui/agent-output/
Copy-Item .worktrees/builder/.agent-output/*.png docs/screenshots/phase3-ui/agent-output/
git -C $root add docs/screenshots/phase3-ui/agent-output/
git -C $root commit -m "docs: Phase 3 agent output screenshots"
```

### 2'.9 — Remove worktrees

```powershell
git -C $root worktree remove .worktrees/forms
git -C $root worktree remove .worktrees/bitrix
git -C $root worktree remove .worktrees/builder
```

### 2'.10 — Tag

```powershell
git -C $root tag phase-3-ui-done
```

**Do NOT merge `phase-3-ui` -> `main` automatically. Wait for human sign-off.**

---

## Phase 3 Acceptance Checklist (Top-Level)

### Visual

- [ ] `/connections` shows 3 cards (or 3 CTAs in empty state): Google Sheets, Facebook, Bitrix24
- [ ] Bitrix24 card uses `bg-bitrix-cyan/10` tile with `BitrixIcon`
- [ ] Module Library modal: 4 sections (Triggers with Watch subgroup, Facebook, Google Sheets, Bitrix24)
- [ ] Triggers section Watch subgroup has exactly 2 entries
- [ ] Iterator badge appears on collapsed step card when previous step is a list/find module
- [ ] Iterator badge appears in expanded card header in same scenarios
- [ ] FieldMappingPicker prefixes options with `item.` when upstream step iterates
- [ ] Watch trigger configs render full forms with required fields

### Functional

- [ ] Clicking "Connect Bitrix24" completes mock flow; card shows Connected
- [ ] Disconnect confirmation popover works
- [ ] All 14 new module config forms open, validate required fields, persist config on change
- [ ] `sheets.delete_row` shows amber destructive-action banner
- [ ] `sheets.create_tab` validates tab name characters
- [ ] `sheets.get_row` validates rowIndex >= 2
- [ ] `fb.list_ad_accounts` shows no-config notice (no input fields)
- [ ] Sample tab in each new module shows mini-table from `sampleOutput`
- [ ] Array-output modules' sample tab has 3 rows
- [ ] Watch trigger forms show blue polling-info banner
- [ ] Existing scenarios render without `fb.account_insights` errors
- [ ] TestRunPanel shows iterator copy when upstream iterates

### Quality

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] All 14 existing unit tests pass
- [ ] axe zero critical/serious violations on all routes
- [ ] Tag `phase-3-ui-done` placed
- [ ] `phase-3-ui` NOT merged to `main` (awaiting human)

---

## Explicit "Do NOT" List

The following are Phase 4. Any agent that does these is out of scope:

- Do NOT add real Bitrix24 OAuth code. The `/api/oauth/bitrix` route is mock-only.
- Do NOT add real Bitrix24 API calls in any module handler or executor.
- Do NOT add real FB list_ads / get_ad / list_ad_accounts API calls.
- Do NOT add real Sheets find_rows / update_row / etc API calls.
- Do NOT add real watch-trigger polling logic in worker or any background process.
- Do NOT modify `worker/index.ts` or `src/server/core/*`.
- Do NOT modify `src/server/api/routers/scenarios.ts` (execution path).
- Do NOT introduce new npm dependencies without orchestrator approval.
- Do NOT use `any` / `// @ts-ignore` / `console.log` in committed code.
- Do NOT merge `phase-3-ui` -> `main` automatically.
- Do NOT write to `src/app/globals.css` — tokens live in `src/styles/globals.css`.

---

## Subagent Quick-Reference Table

| Agent | Worktree | Branch | Primary scope | StepCard zone |
|---|---|---|---|---|
| `Module-Forms-Agent` (A) | `.worktrees/forms` | `phase3/module-forms` | 14 new config form files | MODULE_CONFIG_MAP entries only |
| `Bitrix-Brand-Agent` (B) | `.worktrees/bitrix` | `phase3/bitrix-brand` | Connections layer: Bitrix24 card, 3-CTA empty state, toasts | none |
| `Builder-Iterators-Agent` (C) | `.worktrees/builder` | `phase3/builder-iterators` | Iterator badge, FieldMappingPicker prefix, library modal sections, Watch configs, TestRunPanel copy, renderer wrapper | renderer wrapper only |

**Merge order enforced by orchestrator:** A first, B second, C last.

**Crash-safety note:** Agents A and C both touch `StepCard.tsx`. A's zone = `MODULE_CONFIG_MAP` object and its imports. C's zone = renderer wrapper that calls `MODULE_CONFIG_MAP[...]`. These are non-overlapping lines. If refactoring is needed, A does the refactor to extract the map; C sees the finished map and only edits the wrapper.
