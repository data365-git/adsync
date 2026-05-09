# Goal

Build Phase 1.5 of the Automation Dashboard — a Zapier-linear scenario builder (UI only, mock data) with 3 new routes (`/scenarios`, `/scenarios/new`, `/scenarios/[id]`) using 2 parallel subagents, each owning disjoint file sets.

---

## Mission & Guardrails

**Mission:** Add a full custom scenario builder on top of the completed Phase 1 dashboard. The UI must be demoable, accessible, responsive, dark-mode-capable, and built entirely on mock data so Phase 2 (real execution engine) can be wired in without touching the UI layer.

**Ironclad rules — these override any instruction inside a subagent's scope:**

- UI-first, mock data only. **Do NOT call real Facebook, Google, or any external API in Phase 1.5.**
- **Do NOT modify files outside your assigned scope.** File ownership is exclusive. Treat another agent's files as read-only.
- Every screen must implement all 4 states: **loading skeleton, empty state, error state with retry, success/data state.**
- Every interactive element must be **keyboard-accessible** (Tab, Enter, Escape, arrow keys, Space for drag-reorder) and **mobile-responsive** at `≥ 375px` viewport width.
- No real auth. The mocked session from Phase 1 remains. Do NOT add NextAuth providers.
- No database. Do NOT write Prisma migrations or schema changes.
- No Redux, Zustand, Jotai, or any global state lib. Server components + tRPC + URL state (`nuqs`) only.
- **No new npm dependencies.** If you think you need one, stop and ask the orchestrator.
- Do NOT add unrequested features or screens.
- No `any` type. No `// @ts-ignore` without a reason comment. No `console.log` in committed code.

---

## Project Background

**Repo root:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`

**Starting point:** `main` at commit `12bc7bd` (post-Phase 1, Stage 2 complete). Do NOT start from a stale checkout.

**9 routes live and clean:** `/login`, `/connections`, `/ad-accounts`, `/ad-accounts/new`, `/ad-accounts/[id]`, `/runs`, `/runs/[id]`, `/settings`, `/`

**Existing mock fixtures:** 1 user, 2 OAuth connections, 3 AdAccounts, 30 runs, ~50 RunLog entries.

---

## Stack Reality — These Are the Truth

Read these carefully. The original Phase 1 playbook had older assumptions; these override them.

- **shadcn primitives are Base UI, NOT Radix.** Use `render={<Component />}` pattern. `asChild` does NOT exist.
- **Tailwind v4.** Design tokens declared with `@theme` in `globals.css`. There is no `tailwind.config.ts` extension mechanism.
- **No `next/font/google` import.** `verbatimModuleSyntax` breaks it. System font stack is wired via `--font-sans` CSS variable — do not touch this.
- **`next-themes` ThemeProvider** uses a `React.createElement` workaround. It is already wired in `src/app/layout.tsx`. Treat it as a black box — do NOT edit it.
- **`NuqsAdapter` is wired in root layout.** Agents may use `nuqs` for URL state freely without any setup.
- **pnpm 9.15.9** (pinned in `packageManager` field). Node 22.14.
- **`node_modules` lives inside OneDrive** (junction was abandoned during Phase 1). Do not delete or recreate it.
- **Dev server** runs on port 3000 if free, else 3002. Read the actual port from boot output.
- **`styled-jsx`** is a direct dependency — do not remove it.

---

## Phase 1.5 — What We're Building

A **Zapier-linear scenario builder** for FB + Sheets. UI-only, mocks, no real APIs.

The existing `/ad-accounts` UI survives **unchanged** as "Quick setup". The new `/scenarios` UI is the full custom builder.

### 3 New Routes

| Route | Owner | Purpose |
|---|---|---|
| `/scenarios` | `Scenarios-List-Agent` | List of all custom scenarios + a "Quick setup" card linking to `/ad-accounts`. Empty state with two CTAs. |
| `/scenarios/new` | `Scenarios-Builder-Agent` | Two-step flow: template picker (3 templates) or "From scratch" → builder pre-populated. |
| `/scenarios/[id]` | `Scenarios-Builder-Agent` | Builder with tabs: Builder (default), Run history (filtered), Settings (rename/delete). |

### Builder UI Shape (Zapier-linear, no canvas)

Vertical list of step cards with `+ Add step` buttons between every pair of steps. Header bar with editable scenario name, enabled toggle, "Test" button, "Save" button. Each step card: numbered position indicator, module icon + label, expanded inline config form, drag handle (reorderable; trigger step locked at position 1), delete button (disabled on trigger step).

The `+ Add step` button opens a **module library modal** — filterable, grouped by Facebook / Google Sheets, search input auto-focused on open. Selecting a module inserts a new step at that position with its config form expanded by default.

### 7 Modules (entire library — hardcoded in `src/lib/modules.ts`)

| Type | Module ID | Module Name | Config Fields |
|---|---|---|---|
| Trigger | `trigger.schedule` | Schedule | cron expression + timezone |
| Trigger | `trigger.manual` | Manual run | (none) |
| FB Action | `fb.account_insights` | Get Account Insights | account picker, date window, metrics multi-select (grouped) |
| FB Action | `fb.campaign_insights` | Get Campaign Insights | account, date window, metrics, optional campaign filter |
| FB Action | `fb.ad_insights` | Get Ad Insights | account, date window, metrics, optional campaign filter |
| Sheets Action | `sheets.append` | Append Rows | spreadsheet ID, tab name, field mapping checkboxes |
| Sheets Action | `sheets.upsert` | Upsert Rows | spreadsheet ID, tab name, key fields, field mapping checkboxes |

No filters, no transforms, no branches in Phase 1.5. Linear only.

### 3 Templates (hardcoded in `src/lib/scenario-templates.ts`)

1. **Daily campaign metrics → Sheet** — `trigger.schedule` (daily 06:00) → `fb.campaign_insights` → `sheets.upsert`
2. **Hourly ad performance refresh** — `trigger.schedule` (every 6h) → `fb.ad_insights` → `sheets.upsert`
3. **One-shot manual pull** — `trigger.manual` → `fb.campaign_insights` → `sheets.append`

---

## Stage 0' — Sequential Setup (Orchestrator Only)

> **Run Stage 0' alone on the main branch. Do NOT spawn subagents until the Stage 0' commit succeeds and is verified.**

This stage adds the data layer and shared lib files that both parallel agents will read (but not write) during Stage 1'.

### 0'.1 — Pull main and create branch

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root checkout main
git -C $root pull
git -C $root checkout -b phase-1.5
```

Confirm you are at commit `12bc7bd` before proceeding.

### 0'.2 — Update `src/server/mocks/types.ts` (additive only)

Add the following types. Do NOT modify or remove any existing types — the existing `Run` type gains one new field.

```typescript
export type ScenarioKind = 'QUICK_SETUP' | 'CUSTOM'

export type ModuleType =
  | 'trigger.schedule'
  | 'trigger.manual'
  | 'fb.account_insights'
  | 'fb.campaign_insights'
  | 'fb.ad_insights'
  | 'sheets.append'
  | 'sheets.upsert'

export type ScenarioStep = {
  id: string
  scenarioId: string
  position: number        // 1..N; position 1 is always the trigger
  moduleType: ModuleType
  config: Record<string, unknown>   // shape varies per module
}

export type Scenario = {
  id: string
  userId: string
  name: string
  kind: ScenarioKind
  enabled: boolean
  steps: ScenarioStep[]
  lastRunAt: Date | null
  lastRunStatus: 'success' | 'failed' | null
  createdAt: Date
  updatedAt: Date
}
```

Augment the existing `Run` type by adding one field:

```typescript
// Add to existing Run type:
scenarioId: string   // every run links to a scenario
```

### 0'.3 — Update `src/server/mocks/data.ts`

Add mock scenarios and backfill runs. Keep all existing exports intact.

**3 QUICK_SETUP scenarios** — one per existing AdAccount, canonical 3-step shape. IDs follow pattern `scn_quick_<adAccountId>`. Each mirrors the AdAccount's existing config (cronExpression, spreadsheetId, metrics, etc.) expressed as ScenarioSteps.

**4 CUSTOM scenarios:**

1. `scn_custom_01` — "Multi-account daily roundup" — `trigger.schedule` (daily 07:00) → `fb.account_insights` (Account A) → `sheets.append`. Enabled, last run success.
2. `scn_custom_02` — "Weekly campaign performance" — `trigger.schedule` (Mondays 08:00, `0 8 * * 1`) → `fb.campaign_insights` (Account B) → `sheets.upsert`. Enabled, last run success.
3. `scn_custom_03` — "Manual ad spot-check" — `trigger.manual` → `fb.ad_insights` (Account A) → `sheets.append`. **Disabled**, last run null.
4. `scn_custom_04` — "Hourly velocity check" — `trigger.schedule` (every 1h, `0 * * * *`) → `fb.campaign_insights` (Account B) → `sheets.upsert`. Enabled, **last run failed**.

**Backfill `scenarioId` on all 30 existing `MOCK_RUNS`** — distribute across the 7 scenarios (3 quick + 4 custom) realistically. Quick-setup scenarios get the bulk. `scn_custom_03` gets 0 runs (it's disabled, never been run). `scn_custom_04` gets 3 runs with the last one failed.

Export new constants: `MOCK_SCENARIOS`.

### 0'.4 — Add `src/lib/modules.ts`

Create this file (new, does not exist). It is the single source of truth for the 7-module library.

Each module entry must include:
- `id: ModuleType`
- `name: string`
- `description: string` — one-line description for the library modal card
- `group: 'trigger' | 'facebook' | 'sheets'`
- `icon: string` — lucide-react icon name (e.g. `'Clock'`, `'Zap'`, `'BarChart2'`, `'Table2'`)
- `configSchema` — a plain object describing required fields and their types (used for validation in config forms)
- `sampleOutput: Record<string, unknown>` — a realistic fake output row that `FieldMappingPicker` will show as available fields for the next step

### 0'.5 — Add `src/lib/scenario-templates.ts`

Create this file. Export the 3 templates as factory functions that return a partial `Scenario` (without `id`, `userId`, `createdAt`, `updatedAt`) that the builder pre-populates on template selection.

```typescript
import type { Scenario } from '@/server/mocks/types'
type TemplateFactory = () => Omit<Scenario, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

export const SCENARIO_TEMPLATES: { id: string; name: string; description: string; factory: TemplateFactory }[]
```

### 0'.6 — Update `src/server/api/root.ts` — add two routers

This file re-freezes after Stage 0'. Subagents may call these procedures but must NOT edit `root.ts`.

Add `scenariosRouter` with procedures:
- `list({ includeQuickSetup?: boolean })` — returns `Scenario[]`, filtered by kind if param given
- `getById(id: string)` — returns `Scenario` or throws if not found
- `create(input)` — accepts a partial Scenario shape, generates id + timestamps, returns created `Scenario`
- `update(id, input)` — merges input into existing scenario, returns updated `Scenario`
- `toggleEnabled(id, enabled)` — convenience shortcut for `update`
- `runNow(id)` — creates a new mock `Run` linked to this scenario, returns it
- `testRun(id)` — returns per-step mock results: `{ stepId, status: 'success' | 'failed', output: Record<string, unknown>, durationMs: number }[]`
- `delete(id)` — removes from in-memory mock store, returns `{ success: true }`
- `duplicate(id)` — clones scenario with new id + name suffixed " (copy)", returns new `Scenario`

Add `modulesRouter` with procedures:
- `listModules()` — returns the 7 module definitions from `src/lib/modules.ts`
- `listTemplates()` — returns the 3 templates from `src/lib/scenario-templates.ts`
- `getStepOutputSample(moduleType: ModuleType, config: Record<string, unknown>)` — returns `sampleOutput` from `modules.ts` for the given moduleType (config ignored in Phase 1.5 — always return the static sample)

All procedures use the same artificial 600ms delay pattern as Phase 1.

### 0'.7 — Update `src/components/layout/Sidebar.tsx` (one-time edit on frozen file)

Add a "Scenarios" nav link between "Ad Accounts" and "Runs". Use the `Workflow` icon from lucide-react. The link href is `/scenarios`. Match the exact style of existing sidebar links.

After this edit, `Sidebar.tsx` re-freezes for the duration of Stage 1'.

### 0'.8 — Update runs table to add "Scenario" column (one-time edit on frozen file)

In whichever component renders the runs table (likely `src/components/runs/RunsTable.tsx` or `src/components/runs/RunRow.tsx`), add a **"Scenario" column before the "Account" column**.

The cell content:
- Scenario name as a link to `/scenarios/[scenarioId]`
- If `scenario.kind === 'QUICK_SETUP'`, append a small muted "Quick" badge next to the name
- Derive the scenario name by looking up `scenarioId` in `MOCK_SCENARIOS`

After this edit, `src/components/runs/` files re-freeze for Stage 1'.

### 0'.9 — Update `src/components/runs/detail/RunMetadataGrid.tsx` (one-time edit on frozen file)

Add a "Scenario" metadata cell. Content: scenario name as a link to `/scenarios/[scenarioId]`, with the same "Quick" badge logic as 0'.8.

After this edit, `RunMetadataGrid.tsx` re-freezes for Stage 1'.

### 0'.10 — Update `src/components/ad-accounts/form/AdAccountForm.tsx` (one-time edit on frozen file)

In the save handler (after the `adAccountsRouter.create` or `adAccountsRouter.update` mock call resolves), add a comment-marked block that notes: "Phase 1.5: on AdAccount save, a QUICK_SETUP Scenario is implicitly created/updated at `scn_quick_<adAccountId>`. In Phase 2 this will call scenariosRouter.upsert(). For now, this is a no-op — the scenario already exists in MOCK_SCENARIOS." No visible behaviour change for the user.

After this edit, `AdAccountForm.tsx` re-freezes for Stage 1'.

### 0'.11 — Typecheck and lint

```powershell
pnpm typecheck
pnpm lint
```

Fix all errors before proceeding. No `// @ts-ignore` suppressions.

### 0'.12 — Commit

```powershell
git -C "C:\Users\saman\OneDrive\Documents\data-365-projects\automation" add `
  src/server/mocks/types.ts `
  src/server/mocks/data.ts `
  src/server/api/root.ts `
  src/lib/modules.ts `
  src/lib/scenario-templates.ts `
  src/components/layout/Sidebar.tsx `
  src/components/runs/RunsTable.tsx `
  src/components/runs/RunRow.tsx `
  src/components/runs/detail/RunMetadataGrid.tsx `
  src/components/ad-accounts/form/AdAccountForm.tsx

git -C "C:\Users\saman\OneDrive\Documents\data-365-projects\automation" `
  commit -m "phase 1.5 stage 0': scenarios baseline (mocks, routers, sidebar, runs column)"
```

> **Stage 0' is complete. Verify before spawning subagents:**
> - `pnpm dev` boots without errors
> - Sidebar shows a "Scenarios" link (the route itself will 404 — that is correct; it hasn't been built yet)
> - `/runs` table now shows a "Scenario" column
> - `/runs/[id]` metadata grid now shows a "Scenario" cell
> - `pnpm typecheck` passes

---

## Stage 1' — Parallel Subagents

> Spawn both agents simultaneously. Each runs in its own git worktree. Do NOT start until Stage 0' is committed and verified.

### Worktree Setup (orchestrator runs before dispatching agents)

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree add .worktrees/scenlist    phase15/scenarios-list
git -C $root worktree add .worktrees/scenbuilder phase15/scenarios-builder
```

Each agent works exclusively in its `.worktrees/<name>/` directory. The main worktree (`automation/`) is the orchestrator's working directory during merges.

---

### Agent 1 — `Scenarios-List-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\scenlist`
**Branch:** `phase15/scenarios-list`
**Screen:** `/scenarios`

#### Responsibility

Build the `/scenarios` route — a list of all custom scenarios with inline controls, plus a "Quick setup" card linking to `/ad-accounts`. This is the discovery page for the feature.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/scenarios/page.tsx
src/app/(dashboard)/scenarios/loading.tsx
src/components/scenarios/ScenariosClient.tsx
src/components/scenarios/ScenarioRow.tsx
src/components/scenarios/ScenarioCard.tsx           (mobile fallback, ≤ 768px)
src/components/scenarios/ScenariosEmptyState.tsx
src/components/scenarios/QuickSetupBanner.tsx        (informational card linking to /ad-accounts)
src/components/scenarios/ScenarioEnabledToggle.tsx
src/components/scenarios/ScenarioRunNowButton.tsx
src/components/scenarios/ScenarioKindBadge.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts            (call scenariosRouter.list, toggleEnabled, runNow, delete, duplicate)
src/lib/utils.ts
src/lib/modules.ts
src/lib/scenario-templates.ts
src/components/ui/*               (read-only)
src/components/layout/*           (read-only)
```

#### Files You Must NOT Touch

Everything else. Especially: `src/server/mocks/data.ts` (read only), `src/server/api/root.ts` (read only), any component in `src/components/scenarios/builder/` (owned by Agent 2), any existing Phase 1 routes or components.

#### Definition of Done

- [ ] **Loading:** `loading.tsx` exports a skeleton that shows 4 row-shaped skeletons matching real row dimensions (height, column widths). The `QuickSetupBanner` skeleton is included. No layout shift on hydration.
- [ ] **Empty state (no scenarios at all):** Centered illustration or icon, "You haven't built any scenarios yet.", two equal-weight CTA buttons: "Start from a template" (links to `/scenarios/new?from=template`) and "Build from scratch" (links to `/scenarios/new`).
- [ ] **Empty state (filters applied, zero results):** "No scenarios match your filters." with a "Clear filters" button that resets URL params.
- [ ] **Error state:** Inline error banner with retry. Page chrome and sidebar remain visible.
- [ ] **Success state — desktop (`≥ 768px`):** `<table>` with columns: Name (links to `/scenarios/[id]`), Kind badge (`ScenarioKindBadge`), Enabled toggle, Last Run (relative time + status badge), Actions (kebab menu). `QuickSetupBanner` appears above the table as a muted card.
- [ ] **Success state — mobile (`< 768px`):** Stack of `ScenarioCard` components instead of table. `QuickSetupBanner` at the top.
- [ ] **`ScenarioKindBadge`:** "Custom" = default badge, "Quick Setup" = muted/outline badge. Never the reverse.
- [ ] **`ScenarioEnabledToggle`:** Optimistic update — toggle immediately in UI, call `scenariosRouter.toggleEnabled`, revert + error toast on failure. Disable the toggle while the in-flight call is pending (prevents double-toggle race).
- [ ] **`ScenarioRunNowButton`:** In kebab menu. Shows spinner on click for duration of mocked call. On resolve, updates Last Run to "just now / running". No confirmation dialog required.
- [ ] **Kebab menu actions:** Edit (navigate to `/scenarios/[id]`), Duplicate (calls `duplicate`, adds new row optimistically, shows success toast), Delete (opens confirm `AlertDialog` — cancel focused by default, confirm is red).
- [ ] **URL filter:** Query param `?show=quick` toggles inclusion of QUICK_SETUP scenarios (default: hidden). Implemented with `nuqs`. Persists across page reloads.
- [ ] **Keyboard navigable:** Table rows navigable with arrow keys. Toggle activatable with Space. Kebab opens with Enter/Space and closes with Escape. Focus rings visible.
- [ ] **ARIA:** Table has `aria-label`. Status badges have `role="status"`. Toggle has descriptive `aria-label`. Kebab button has `aria-label="Scenario options for [name]"`.
- [ ] **`prefers-reduced-motion`:** Spinner and optimistic fade animations gated.

#### UI/UX Best Practices — Scenarios List

1. **Reuse the skeleton row dimensions from `/ad-accounts` skeletons exactly.** Both list pages live in the same sidebar section and should feel visually consistent — same row height, same column rhythm. A user who navigates between them should feel they are in the same product family, not two different apps.

2. **The `QuickSetupBanner` is informational, not promotional.** Keep it muted (`bg-muted/50` card with a `text-muted-foreground` label). The primary feature on `/scenarios` is the custom scenario list — the banner is a navigation aid, not a CTA. A prominent banner competes with the real content and diminishes the page hierarchy.

3. **The filter toggle "Show Quick Setup scenarios" must persist in the URL via `nuqs`.** A power user comparing their custom scenarios vs. quick-setup scenarios across reloads and browser sessions expects the filter to stick. React state evaporates on reload — URL state does not.

4. **Optimistic UI for the enabled toggle must handle the rapid-click race condition.** Disable the toggle while the in-flight call is pending. If you allow rapid toggling before the first call resolves, the UI and server state can desync silently — the user thinks they enabled a scenario that is actually disabled. Prevent it at the UI layer.

5. **Empty state must distinguish two very different user situations.** "No scenarios at all" calls for onboarding-style CTAs with equal weight between "template" and "scratch". "No scenarios matching filters" calls for a single "Clear filters" action. Showing the same empty state for both confuses users about whether their data is missing or just filtered out.

6. **The `ScenarioKindBadge` visual weight must match semantic importance.** Custom scenarios are the feature; their badge should be neutral or primary. Quick Setup scenarios are a legacy shortcut; their badge should be muted/outline. Never invert this — a loud badge on "Quick Setup" makes it look more important than custom scenarios.

7. **Kebab delete must not auto-delete.** Always show a confirm `AlertDialog` with the scenario name in the body copy ("Delete 'Weekly campaign performance'?"), focus "Cancel" by default, and require a deliberate click on the red "Delete" button. Silent deletes erode trust.

---

### Agent 2 — `Scenarios-Builder-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\scenbuilder`
**Branch:** `phase15/scenarios-builder`
**Screens:** `/scenarios/new` and `/scenarios/[id]`

#### Responsibility

Build the template picker (`/scenarios/new`) and the Zapier-linear scenario builder (`/scenarios/[id]`). This is the most complex UI in Phase 1.5.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/scenarios/new/page.tsx
src/app/(dashboard)/scenarios/new/loading.tsx
src/app/(dashboard)/scenarios/[id]/page.tsx
src/app/(dashboard)/scenarios/[id]/loading.tsx
src/components/scenarios/builder/ScenarioBuilder.tsx
src/components/scenarios/builder/BuilderHeader.tsx
src/components/scenarios/builder/StepCard.tsx
src/components/scenarios/builder/StepConnector.tsx
src/components/scenarios/builder/AddStepButton.tsx
src/components/scenarios/builder/ModuleLibraryModal.tsx
src/components/scenarios/builder/ModuleLibraryCard.tsx
src/components/scenarios/builder/TemplatePicker.tsx
src/components/scenarios/builder/TestRunPanel.tsx
src/components/scenarios/builder/UnsavedChangesGuard.tsx
src/components/scenarios/builder/StepTabs.tsx
src/components/scenarios/builder/SettingsTab.tsx
src/components/scenarios/builder/RunsTab.tsx
src/components/scenarios/builder/modules/ScheduleConfig.tsx
src/components/scenarios/builder/modules/ManualConfig.tsx
src/components/scenarios/builder/modules/FbAccountInsightsConfig.tsx
src/components/scenarios/builder/modules/FbCampaignInsightsConfig.tsx
src/components/scenarios/builder/modules/FbAdInsightsConfig.tsx
src/components/scenarios/builder/modules/SheetsAppendConfig.tsx
src/components/scenarios/builder/modules/SheetsUpsertConfig.tsx
src/components/scenarios/builder/modules/FieldMappingPicker.tsx
src/components/scenarios/builder/modules/ModuleConfigShell.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts            (call scenariosRouter.*, modulesRouter.*)
src/lib/utils.ts
src/lib/modules.ts
src/lib/scenario-templates.ts
src/components/ui/*               (read-only)
src/components/layout/*           (read-only)
src/components/runs/*             (read-only — do not write to these files)
```

#### Files You Must NOT Touch

Everything outside your owned list. Especially: Agent 1's files in `src/components/scenarios/` (non-builder), any existing Phase 1 routes or components, `src/server/mocks/*`, `src/server/api/root.ts`, `src/lib/*`.

#### Definition of Done

**`/scenarios/new` — template picker:**

- [ ] **Loading:** Skeleton showing 3 card-shaped placeholders + a "From scratch" link placeholder.
- [ ] **Success:** `TemplatePicker` renders 3 template cards (name, description, step count badge) + a "Build from scratch" text link below them. Clicking a template card navigates to `/scenarios/new?template=<templateId>` which pre-populates the builder. Clicking "From scratch" navigates to `/scenarios/new` without a template param (empty builder).
- [ ] **Builder (from template):** Scenario name pre-filled from template name. Steps pre-populated from template's factory function. All step cards expanded by default.
- [ ] **Builder (from scratch):** One empty trigger step card present (position 1, no module selected — shows a "Choose trigger" placeholder). The `+ Add step` button below it is present.

**`/scenarios/[id]` — existing scenario builder:**

- [ ] **Loading:** Skeleton: header bar with name + buttons, 3 step card skeletons, tabs skeleton.
- [ ] **Error (load):** Inline retry with back-navigation preserved.
- [ ] **Success:** Tabs at top: "Builder" (default), "Run History", "Settings".

**Builder tab (both routes):**

- [ ] **`BuilderHeader`:** Scenario name is inline-editable (click to edit, blur/Enter to confirm, Escape to cancel). Enabled toggle (same optimistic pattern as list page). "Test" button (runs `scenariosRouter.testRun(id)`, renders `TestRunPanel`). "Save" button (calls `create` or `update`, shows loading state, toast on success/failure). Save button is disabled while required fields are unfilled — shows tooltip "X required fields missing in Y steps" on hover/focus of the disabled button.
- [ ] **Step cards (`StepCard`):** Numbered position pill (1, 2, 3...). Module icon + name in card header. Drag handle (right side). Delete button (disabled on position-1 trigger step, enabled on all others). Inline config form (expanded by default on new scenario; collapsed by default on existing scenario being edited — user can expand individually).
- [ ] **`StepConnector`:** Visual vertical line between step cards.
- [ ] **`AddStepButton`:** Appears between every pair of consecutive steps and below the last step. **Always visible** at ~30% opacity. Full opacity on focus or hover. Clicking opens `ModuleLibraryModal` at that position. Never fully hidden — discovery of this button is critical.
- [ ] **`ModuleLibraryModal`:** Opens on `AddStepButton` click. Search input auto-focused on open. Esc closes modal without adding a step. Modules grouped by section: "Triggers" / "Facebook" / "Google Sheets". Each module shown as a `ModuleLibraryCard` (icon, name, one-line description). Clicking a card inserts a new step at the target position, closes modal, expands new step's config form.
- [ ] **Config forms — all 7 modules implemented:**
  - `ScheduleConfig`: cron expression text input + human-readable preview below it + timezone `<Select>`. Required: cron expression + timezone.
  - `ManualConfig`: no config fields, shows "This step triggers when you click Run Now." informational note.
  - `FbAccountInsightsConfig`: account picker (from `MOCK_AD_ACCOUNTS`), date window (1–30 days), metrics multi-select (grouped, same as Phase 1 form). All required.
  - `FbCampaignInsightsConfig`: same as above + optional campaign filter text input.
  - `FbAdInsightsConfig`: same as `FbCampaignInsightsConfig`.
  - `SheetsAppendConfig`: spreadsheet ID input, tab name input, `FieldMappingPicker` (required — at least 1 field selected).
  - `SheetsUpsertConfig`: spreadsheet ID, tab name, key fields multi-select, `FieldMappingPicker`.
- [ ] **`FieldMappingPicker`:** Shows checkboxes for available output fields from the previous step (fetched via `modulesRouter.getStepOutputSample(prevStepModuleType, prevStepConfig)`). "Select all" checkbox at top of list. Required: at least 1 field checked.
- [ ] **`ModuleConfigShell`:** Shared wrapper around all config forms — provides consistent padding, header row (icon + module name + remove button), expand/collapse toggle.
- [ ] **Drag-to-reorder:** Steps reorder by dragging the drag handle. Trigger step (position 1) is locked — its drag handle is disabled/hidden. Drag-reorder also works via keyboard: focus drag handle → Space to lift → Arrow keys to move → Space to drop. All positions renumber after drop.
- [ ] **`TestRunPanel`:** Appears inline below the step list when "Test" is clicked. Shows per-step result row: step number + module name, ✓ or ✗ icon, duration badge. Each row has a collapsible `<details>` block showing the sample output JSON (formatted, monospace). "Close test results" button at the bottom.
- [ ] **`UnsavedChangesGuard`:** Warns on router navigation away from a dirty form. Uses the same `beforeunload` + `AlertDialog` pattern as `/ad-accounts/[id]`.

**Run History tab (`/scenarios/[id]` only):**

- [ ] `RunsTab` shows runs filtered to `scenarioId === id`. Composes `RunRow` from `src/components/runs/` (read-only import). Falls back to an inline minimal version if import is problematic. Pagination: 10 rows. Empty state: "No runs for this scenario yet."

**Settings tab (`/scenarios/[id]` only):**

- [ ] `SettingsTab` has: rename input (pre-filled with current name, saves on blur), "Duplicate scenario" button (calls `duplicate`, navigates to new scenario), danger zone with "Delete scenario" button that opens a type-`DELETE`-to-confirm `AlertDialog` (same UX pattern as `/settings` danger zone).

**All routes:**

- [ ] All 4 states implemented per route.
- [ ] Keyboard accessible throughout — Tab through steps, Enter expands/collapses cards, drag-reorder via keyboard.
- [ ] ARIA: step list is `<ol aria-label="Scenario steps">`. Drag handles have `aria-label="Drag to reorder step N"`. Modal has `role="dialog"` and `aria-modal="true"`. TestRunPanel has `aria-live="polite"`.
- [ ] `prefers-reduced-motion`: expand/collapse animations, drag animations, TestRunPanel entrance gated.
- [ ] Commit messages prefixed `scenarios:`.

#### UI/UX Best Practices — Scenarios Builder

1. **`+ Add step` buttons must always be visible at low opacity (~30%).** Never fully hidden. Users who have never used this builder need to discover how to add steps — making the control invisible until hover means many users will not find it. Discovery beats minimalism when a feature is novel.

2. **The module library modal must auto-focus the search input on open and support Enter-to-select.** Power users composing multi-step flows entirely from the keyboard (search, arrow down, Enter) should never need to reach for a mouse. This is standard UX in command-palette style UIs and sets the bar for this modal.

3. **Step cards must be expanded by default on a new scenario, collapsed by default on an existing one.** A user building a new flow wants to configure each step immediately. A user reviewing an existing scenario they built last week does not want every form open — they want to see the shape of the flow at a glance, then expand what they need to change.

4. **`FieldMappingPicker` must have a "Select all visible" checkbox at the top of the field list.** FB Insights modules can output 20+ fields. Requiring the user to individually check each one they want to sync to Sheets is unreasonable friction for the common case ("I want everything"). "Select all" must also "Deselect all" on second click (toggle).

5. **Test run output must appear inline below the step list, not in a modal.** The user's mental model is: "I configured these steps — let me see what they produce." They need to compare configuration and output side-by-side. A modal forces them to close the modal to re-check their config, then re-open it to look at the output again. Inline eliminates that context switch.

6. **Save button disabled state must explain why, not just be grey.** Show a tooltip on the disabled button: "3 required fields missing in steps 2, 3" with specific step numbers. A grey button with no explanation is the single most frustrating pattern in form UIs — the user has no idea where to look.

7. **Drag-to-reorder must work via keyboard.** Focus a drag handle → Space to "lift" the step → Arrow Up / Arrow Down to move it → Space to "drop". This is the WCAG-compliant pattern for reorderable lists. Mouse-only drag is an accessibility failure.

8. **When the Trigger step's module type is changed (Schedule ↔ Manual), preserve compatible config fields.** If the user had entered a timezone in `ScheduleConfig` and then switches to a different trigger, don't silently wipe the timezone — it may be re-used if they switch back. Only wipe config that is genuinely incompatible (e.g. cron expression when switching to Manual).

9. **Removing the only action step still leaves the trigger — this is a valid state, not an error.** A scenario with just one trigger step and no actions is useless but not broken. Do not throw, do not auto-delete the trigger, do not show an error state. Show a soft informational note inside the builder: "Add at least one action step to make this scenario runnable."

10. **The Settings tab's Delete button must use the type-`DELETE`-to-confirm pattern.** This matches the Danger Zone in `/settings` — consistency in destructive UX across the app matters. A user who has already learned the pattern in Settings should recognize it immediately here.

---

## Stage 2' — Merge & Integration (Orchestrator, After Both Subagents Finish)

> Run only after both subagents have committed to their branches.

### 2'.1 — Merge order

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root checkout phase-1.5

# No file overlaps between the two branches — merge in either order
git -C $root merge --no-ff phase15/scenarios-list    -m "merge: scenarios list UI"
git -C $root merge --no-ff phase15/scenarios-builder  -m "merge: scenarios builder UI"
```

If any merge conflict occurs, a subagent wrote outside its assigned files. Identify the file, revert it in the agent's branch, re-merge.

### 2'.2 — Verify sidebar and routing

```
/scenarios       → ScenariosClient (list page)
/scenarios/new   → TemplatePicker + builder
/scenarios/[id]  → builder tabs
```

Confirm the "Scenarios" sidebar link from Stage 0'.7 is present and active on all three routes.

### 2'.3 — Typecheck and lint

```powershell
pnpm typecheck
pnpm lint
```

Fix all errors. No `// @ts-ignore` suppressions.

### 2'.4 — Accessibility check

```powershell
pnpm dlx @axe-core/cli http://localhost:3000/scenarios
pnpm dlx @axe-core/cli http://localhost:3000/scenarios/new
pnpm dlx @axe-core/cli "http://localhost:3000/scenarios/scn_custom_01"
```

Zero critical or serious violations. Fix before proceeding.

### 2'.5 — Lighthouse

Same thresholds as Phase 1 (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90) on all 3 new routes in both light and dark mode.

### 2'.6 — Screenshots

```powershell
New-Item -ItemType Directory -Force -Path docs/screenshots/phase15

# Capture 3 routes × {light, dark} × {desktop 1440px, mobile 375px} = 12 PNGs
# Naming: {route}-{theme}-{breakpoint}.png
# Examples: scenarios-list-dark-desktop.png, scenarios-builder-light-mobile.png
```

Commit screenshots:

```powershell
git add docs/screenshots/phase15/
git commit -m "docs: Phase 1.5 screenshots (light + dark, desktop + mobile)"
```

### 2'.7 — Remove worktrees

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree remove .worktrees/scenlist
git -C $root worktree remove .worktrees/scenbuilder
```

### 2'.8 — Final commit and tag

```powershell
git -C "C:\Users\saman\OneDrive\Documents\data-365-projects\automation" tag phase-1.5-done
```

---

## Phase 1.5 Acceptance Checklist

### Routes

- [ ] `/scenarios` — list renders with 4 custom + 3 quick-setup scenarios (quick hidden by default), Quick Setup banner present, toggle, run now, kebab, URL filter
- [ ] `/scenarios` — empty state shows two equal-weight CTAs
- [ ] `/scenarios/new` — template picker shows 3 template cards + "From scratch" link
- [ ] `/scenarios/new?template=<id>` — builder pre-populated from template
- [ ] `/scenarios/new` (no template) — builder with empty trigger step placeholder
- [ ] `/scenarios/[id]` — Builder tab: all steps rendered, Add step buttons visible at 30% opacity, all 7 config forms functional
- [ ] `/scenarios/[id]` — Run History tab: runs filtered to this scenario
- [ ] `/scenarios/[id]` — Settings tab: rename, duplicate, delete-with-confirm

### 4 States Per Route

- [ ] Every route has a `loading.tsx` skeleton matching real layout dimensions
- [ ] Every route has a visible, actionable empty state
- [ ] Every route has an error state with a working retry
- [ ] Every route has a success/data state with realistic mock data

### Builder Completeness

- [ ] All 7 module config forms implemented with their own validation
- [ ] `FieldMappingPicker` shows sample output fields from previous step, "Select all" checkbox present
- [ ] `TestRunPanel` appears inline below steps, shows per-step ✓/✗ + collapsible sample output
- [ ] Save button disabled state shows tooltip with specific missing-field count
- [ ] Drag-to-reorder works (mouse + keyboard)
- [ ] Trigger step (position 1) is not deletable; its drag handle is disabled
- [ ] `UnsavedChangesGuard` fires on navigation with dirty form
- [ ] Module library modal auto-focuses search, Esc closes, Enter selects

### Sidebar & Runs Updates (Stage 0')

- [ ] "Scenarios" link in sidebar, between Ad Accounts and Runs, with Workflow icon
- [ ] `/runs` table shows "Scenario" column before "Account" column, Quick badge on QUICK_SETUP rows
- [ ] `/runs/[id]` metadata grid shows "Scenario" cell linking to `/scenarios/[id]`

### Accessibility

- [ ] Zero critical/serious axe violations on all 3 new routes
- [ ] Step list is `<ol>` with ARIA label
- [ ] Modal has `role="dialog"` and `aria-modal="true"`, focus trapped
- [ ] All drag handles keyboard-operable (Space lift, arrows move, Space drop)
- [ ] All focus rings visible
- [ ] `prefers-reduced-motion` respected on expand/collapse, drag, TestRunPanel

### Responsive

- [ ] `/scenarios` switches table → cards at 768px
- [ ] Builder is usable (not broken) at 375px — step cards stack, header wraps gracefully
- [ ] Module library modal is full-screen on mobile

### Dark Mode

- [ ] All 3 new routes correct in dark mode
- [ ] 12 screenshots committed to `docs/screenshots/phase15/`

---

## Explicit "Do NOT" List

- **Do NOT call real Facebook Graph API, Google Sheets API, or any external HTTP endpoint.** All data from `src/server/mocks/`.
- **Do NOT write Prisma schema changes or migrations.**
- **Do NOT add NextAuth providers.** Session is still from `getMockSession()`.
- **Do NOT add Redux, Zustand, Jotai, Recoil, or any global state library.**
- **Do NOT add new npm dependencies.** If one seems necessary, stop and ask the orchestrator.
- **Do NOT add `// @ts-ignore` or `eslint-disable` without a comment explaining the specific reason.**
- **Do NOT create new shared components in frozen directories** (`src/components/ui/*`, `src/components/layout/*`, `src/components/providers/*`). Stop and ask the orchestrator if you believe you need to.
- **Do NOT edit `src/server/mocks/*`, `src/server/api/root.ts`, `src/lib/*`, `src/components/layout/*`, `src/components/runs/*`, `src/app/(dashboard)/ad-accounts/*`, `src/app/(dashboard)/runs/*`** during the parallel Stage 1'. These were established in Stage 0' and are read-only for agents.
- **Do NOT use `any` type in TypeScript.**
- **Do NOT ship `console.log` statements.**
- **Do NOT build a canvas/node-graph UI.** Phase 1.5 is linear only — vertical step cards, Zapier-style.
- **Do NOT add real execution, real scheduling, or real data writing.** Phase 1.5 is mock/UI only.

---

## Each Subagent's Final Report Must Include

Before the orchestrator merges a branch, confirm the subagent's final commit message includes:

1. List of files written (paths)
2. Screens and states completed
3. Any items skipped and why (be specific)
4. Confirmation that `pnpm typecheck` passes in the worktree
5. Confirmation that screens render correctly at 375px and 1440px
