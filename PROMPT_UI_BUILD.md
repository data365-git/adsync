# Goal

Build the complete UI-first phase (Phase 1, mock data only) of the **Automation Dashboard** — a single-user web app that orchestrates Facebook Ads → Google Sheets syncs — using Next.js 14 App Router, TypeScript, tRPC (mocked), TailwindCSS, and shadcn/ui, with 6 parallel subagents owning disjoint file sets.

---

## Mission & Guardrails

**Mission:** Deliver a pixel-complete, accessible, responsive, dark-mode-capable dashboard UI with full mock data so the product is demoable and Phase 2 (real APIs, auth, DB) can be wired in without touching the UI layer.

**Ironclad rules — these override any instruction inside a subagent's scope:**

- UI-first, mock data only. **Do NOT call real Facebook, Google, or any external API in Phase 1.**
- **Do NOT modify files outside your assigned scope.** File ownership is exclusive. Treat another agent's files as read-only.
- Every screen must implement all 4 states: **loading skeleton, empty state, error state with retry, success/data state.**
- Every interactive element must be **keyboard-accessible** (Tab, Enter, Escape, arrow keys where applicable) and **mobile-responsive** at `≥ 375px` viewport width.
- No real auth. Use a **mocked session** (`src/server/mocks/session.ts`) that returns a hardcoded user. Do NOT add NextAuth providers.
- No database. Do NOT write Prisma migrations or schema changes.
- No Redux, Zustand, Jotai, or any global state lib. Use server components + tRPC + URL state (`nuqs` or `searchParams`).
- Do NOT add unrequested features or screens.
- **Pin:** Node 20 LTS, Next.js 14 App Router, pnpm, TypeScript strict mode.

---

## Project Background

**Product:** Personal single-user dashboard. Pulls FB Ads performance into Google Sheets on schedule + manual trigger.

**Repo root:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`

**Existing shell (empty .gitkeep files only — safe to overwrite):**

```
automation/
├─ src/
│  ├─ app/
│  │  ├─ (dashboard)/
│  │  ├─ api/auth/
│  │  └─ api/oauth/
│  ├─ server/
│  │  ├─ api/
│  │  └─ core/
│  ├─ integrations/
│  │  ├─ facebook/
│  │  └─ google/
│  └─ db/
├─ worker/
├─ prisma/
└─ tests/
```

**Stack:** Next.js 14 App Router · TypeScript (strict) · tRPC v11 · Prisma (Phase 2 only) · NextAuth (Phase 2 only) · TailwindCSS · shadcn/ui · pnpm · create-t3-app base.

**OneDrive caveat:** The project lives inside OneDrive sync. `node_modules` must be junctioned to avoid syncing 30k files. Setup instructions are in Stage 0 below.

---

## Stage 0 — Sequential Setup (NO subagents until this is committed)

> **The orchestrator runs Stage 0 alone. No subagent is spawned until `git commit` at the end of this stage succeeds.**

### 0.1 — Bootstrap the project

```powershell
# From C:\Users\saman\OneDrive\Documents\data-365-projects
pnpm dlx create-t3-app@latest automation --noGit --CI --appRouter --trpc --tailwind --noAuth --noPrisma --noDb --packageManager pnpm
```

If `create-t3-app` refuses to write into a non-empty directory, run it into a temp dir and merge:

```powershell
pnpm dlx create-t3-app@latest automation-tmp --noGit --CI --appRouter --trpc --tailwind --noAuth --noPrisma --noDb --packageManager pnpm
# Then robocopy automation-tmp\ automation\ /E /XO, then Remove-Item automation-tmp -Recurse
```

### 0.2 — OneDrive node_modules junction

```powershell
# Create the cache target if it does not exist
if (-not (Test-Path "C:\dev\node-modules-cache\automation")) {
    New-Item -ItemType Directory -Force -Path "C:\dev\node-modules-cache\automation"
}

# Remove the node_modules folder created by pnpm (if any)
if (Test-Path "automation\node_modules") {
    Remove-Item "automation\node_modules" -Recurse -Force
}

# Create the junction
cmd /c mklink /J "automation\node_modules" "C:\dev\node-modules-cache\automation"

# Verify
(Get-Item "automation\node_modules").Attributes
# Should include ReparsePoint
```

### 0.3 — Install dependencies

```powershell
cd automation
pnpm install
```

### 0.4 — Add shadcn/ui and required primitives

```powershell
pnpm dlx shadcn-ui@latest init
# Select: TypeScript, Tailwind, CSS variables, src/, Next.js App Router, slate base colour, yes to aliases

# Add required components (one command)
pnpm dlx shadcn-ui@latest add button card badge input label select checkbox switch \
  skeleton dialog alert-dialog dropdown-menu popover tooltip \
  table tabs progress separator avatar scroll-area command sheet
```

### 0.5 — Add supporting packages

```powershell
pnpm add nuqs lucide-react date-fns clsx tailwind-merge class-variance-authority
pnpm add -D @axe-core/playwright @playwright/test
```

### 0.6 — Theme provider and design tokens

Create `src/components/providers/ThemeProvider.tsx` — wraps `next-themes`. Export `ThemeToggle` component with light/dark/system cycling. Add CSS custom properties in `src/app/globals.css` for:

- `--background`, `--foreground`, `--muted`, `--muted-foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--ring`
- `--success` `#22c55e`, `--warning` `#f59e0b`, `--error` `#ef4444`
- Status colours used across runs: `queued` (slate), `running` (blue), `success` (green), `failed` (red)

All tokens must have dark-mode overrides inside `.dark {}`.

### 0.7 — Create mock fixtures

Create `src/server/mocks/` with the following files. Types in each file must match the future Prisma models exactly (so Phase 2 only swaps the data source, not the shape).

**`src/server/mocks/types.ts`**

```typescript
export type User = {
  id: string
  email: string
  name: string
  image: string | null
  allowlisted: boolean
  timezone: string
  theme: 'light' | 'dark' | 'system'
  createdAt: Date
}

export type OAuthConnection = {
  id: string
  userId: string
  provider: 'google' | 'facebook'
  status: 'connected' | 'expired' | 'disconnected'
  email: string | null
  expiresAt: Date | null
  connectedAt: Date | null
}

export type AdAccount = {
  id: string
  userId: string
  label: string
  fbAccountId: string
  enabled: boolean
  levels: ('CAMPAIGN' | 'AD')[]
  metrics: string[]
  dateWindowDays: number
  spreadsheetId: string
  campaignTabName: string
  adTabName: string
  cronExpression: string
  timezone: string
  lastRunAt: Date | null
  lastRunStatus: 'success' | 'failed' | null
  createdAt: Date
}

export type RunStatus = 'queued' | 'running' | 'success' | 'failed'
export type RunTrigger = 'manual' | 'scheduled'

export type Run = {
  id: string
  userId: string
  adAccountId: string
  trigger: RunTrigger
  status: RunStatus
  startedAt: Date
  finishedAt: Date | null
  campaignRowsWritten: number | null
  adRowsWritten: number | null
  durationMs: number | null
  errorMessage: string | null
  sheetsUrl: string | null
}

export type RunLog = {
  id: string
  runId: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
  meta: Record<string, unknown> | null
  timestamp: Date
}
```

**`src/server/mocks/data.ts`** — Seed realistic data:

- 1 user: `{ id: 'user_01', email: 'jumanovsamandar005@gmail.com', name: 'Samandar', image: null, allowlisted: true, timezone: 'Asia/Tashkent', theme: 'system' }`
- 2 OAuth connections: Google (connected, expires 2 days from now), Facebook (connected, no expiry)
- 3 AdAccount records:
  - Account A: enabled, CAMPAIGN+AD levels, runs daily at 06:00, last run success
  - Account B: enabled, CAMPAIGN only, runs every 6h, last run failed
  - Account C: disabled, AD only, no schedule, never run
- 30 Run records spread over last 14 days — mix of manual/scheduled, success (20) / failed (8) / running (1) / queued (1). Include realistic durations (800ms–45s). Failed runs have `errorMessage` set.
- 50 RunLog entries tied to the 8 failed runs — mix of INFO breadcrumbs and ERROR entries with `meta` JSON (FB API error code, retries, etc).

Export typed constants: `MOCK_USER`, `MOCK_CONNECTIONS`, `MOCK_AD_ACCOUNTS`, `MOCK_RUNS`, `MOCK_RUN_LOGS`.

**`src/server/mocks/session.ts`**

```typescript
import { MOCK_USER } from './data'
export function getMockSession() {
  return { user: MOCK_USER, expires: '2099-01-01' }
}
```

### 0.8 — tRPC router skeleton

Establish `src/server/api/root.ts` with mocked procedures. This file is **frozen** during the parallel stage. Subagents call these procedures but must NOT edit this file.

Required routers and procedures:

```
authRouter         — getSession() → MockSession
connectionsRouter  — list() → OAuthConnection[], connect(provider), disconnect(id), refresh(id)
adAccountsRouter   — list() → AdAccount[], getById(id) → AdAccount, create(input), update(id, input), toggleEnabled(id, enabled), runNow(id)
runsRouter         — list(filters) → Run[] + pagination, getById(id) → Run
runLogsRouter      — byRunId(runId) → RunLog[]
settingsRouter     — get() → User, updateTheme(theme), updateTimezone(timezone), deleteAllData()
fbRouter           — listAvailableAccounts() → { id: string; name: string }[]
```

All procedures return from mock fixtures immediately (no `await`, add a `await new Promise(r => setTimeout(r, 600))` artificial delay in each to simulate network for skeleton demos).

### 0.9 — App shell

Create:

- `src/app/layout.tsx` — root layout: `<html>`, `ThemeProvider`, `TRPCReactProvider`, global font (Inter via `next/font`)
- `src/app/(dashboard)/layout.tsx` — protected layout: sidebar navigation, top bar with theme toggle + user avatar dropdown. Sidebar links: Dashboard (redirect to /connections for Phase 1), Connections, Ad Accounts, Runs, Settings.
- `src/app/(dashboard)/page.tsx` — redirect to `/connections`
- `src/app/login/page.tsx` — login page shell (basic, subagent `Settings-Login-Agent` will fill it in)
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/UserMenu.tsx`

### 0.10 — Shared utility files

Create these shared files (read-only during parallel stage):

- `src/lib/utils.ts` — `cn()` helper, `formatDuration(ms)`, `formatCron(expr)` (pretty-print cron: "Every day at 06:00"), `getStatusColor(status)`, `getStatusLabel(status)`
- `src/lib/constants.ts` — `FB_METRICS` grouped object:
  ```typescript
  export const FB_METRICS = {
    Delivery: ['impressions', 'reach', 'frequency', 'clicks', 'ctr'],
    Cost: ['spend', 'cpm', 'cpc', 'cpp'],
    Conversion: ['conversions', 'conversion_rate', 'cost_per_conversion', 'roas'],
    Video: ['video_views', 'video_view_rate', 'video_p25_watched', 'video_p100_watched'],
  } as const
  ```
- `src/lib/mock-fb-accounts.ts` — 5 fake FB ad account names/IDs for the picker dropdown

### 0.11 — Initial commit

```powershell
git init
git add .
git commit -m "Stage 0: project bootstrap, mocks, tRPC skeleton, app shell"
```

> Stage 0 is complete. Proceed to spawn parallel subagents.

---

## Stage 1 — Parallel Subagents

> Spawn all 6 agents simultaneously. Each runs in its own git worktree. No agent starts until Stage 0 is committed.

### Worktree Setup (orchestrator runs before dispatching agents)

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree add .worktrees/connections  ui/connections-ui
git -C $root worktree add .worktrees/adlist       ui/adaccounts-list
git -C $root worktree add .worktrees/adform       ui/adaccount-form
git -C $root worktree add .worktrees/runs         ui/runs-history
git -C $root worktree add .worktrees/rundetail    ui/run-detail
git -C $root worktree add .worktrees/settings     ui/settings-login
```

Each agent works exclusively in its `.worktrees/<name>/` directory. The main worktree (`automation/`) is the orchestrator's working directory during merges.

---

### Agent 1 — `Connections-UI-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\connections`
**Branch:** `ui/connections-ui`
**Screens:** Connections page

#### Responsibility

Build the `/connections` route — a page showing the live connection status of Google Sheets and Facebook Ads, with connect/reconnect/disconnect controls.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/connections/page.tsx
src/app/(dashboard)/connections/loading.tsx
src/components/connections/ConnectionCard.tsx
src/components/connections/ConnectionStatus.tsx
src/components/connections/DisconnectDialog.tsx
src/components/connections/TokenExpiryWarning.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts          (call connectionsRouter procedures)
src/lib/utils.ts
src/components/ui/*             (shadcn primitives — READ ONLY)
src/components/layout/*         (layout shell — READ ONLY)
```

#### Files You Must NOT Touch

Everything else, especially: `src/server/mocks/data.ts` (no edits), any other agent's directories, `src/app/(dashboard)/layout.tsx`.

#### Definition of Done

- [ ] **Loading state:** `loading.tsx` exports a skeleton that shows 2 card-shaped skeletons matching the real card dimensions exactly (avoid layout shift on hydration).
- [ ] **Empty state:** If `connections.list()` returns an empty array, show a centered illustration + "No connections yet. Connect Google Sheets or Facebook to get started." with both CTAs.
- [ ] **Error state:** If `connectionsRouter.list()` throws, show an inline error banner with a "Retry" button that re-runs the query. Do not show a full-page error — keep the page chrome visible.
- [ ] **Success state:** 2 cards side by side (stack vertically on mobile). Each card shows provider logo/icon, account email, connection status badge, connected-since date, and action buttons.
- [ ] **Token expiry warning:** If `expiresAt` is within 3 days, render `TokenExpiryWarning` — an amber inline alert inside the card with "Expires in X hours. Reconnect now."
- [ ] **Status badges:** `connected` = green, `expired` = amber, `disconnected` = slate.
- [ ] **Disconnect:** Opens `DisconnectDialog` — a modal (shadcn `AlertDialog`) with the provider name in the title, a warning that this will pause all syncs using that connection, and "Cancel" (default focus, keyboard-escapable) / "Disconnect" (destructive, red) buttons. Calls `connectionsRouter.disconnect(id)` on confirm. Optimistic UI: immediately set the card to "Disconnecting..." and revert on error.
- [ ] **Connect / Reconnect:** Calls `connectionsRouter.connect(provider)`. Shows a loading spinner on the button while in-flight. In Phase 1 this immediately resolves (mocked).
- [ ] **Accessibility:** Cards are `<article>` with `aria-label`. Buttons have descriptive `aria-label` not just icon. Dialog traps focus. Status badge has `role="status"`.
- [ ] **Responsive:** Cards stack at `< 640px`. All tap targets ≥ 44px.

#### UI/UX Best Practices — Connections Screen

1. **Card skeleton dimensions must match real card layout exactly.** Measure the real card's height at each breakpoint and hardcode those dimensions in the skeleton. A skeleton that collapses and then expands on hydration causes jarring layout shift — worse than no skeleton.
2. **The Disconnect confirmation dialog must default focus to "Cancel", not "Disconnect".** Destructive actions must require deliberate intent. The user pressed the wrong button; the default focus saves them. Implement with `<AlertDialogCancel autoFocus>`.
3. **Token expiry warnings should not compete with the primary action.** Use an amber `Alert` component *inside* the card, below the status row, not a floating toast or a full-page banner. The user should see expiry and the "Reconnect" CTA in one glance without context-switching.
4. **Connection status is the most important piece of information on this page.** Make the status badge the first visual element in the card after the provider logo — before the email, before buttons. Color-code it and add a text label (don't rely on color alone for accessibility).
5. **Optimistic UI for disconnect must have a visible rollback.** If the mocked disconnect call throws, revert the card state and show a toast: "Failed to disconnect. Please try again." Use `react-hot-toast` or shadcn `Sonner` for non-blocking toasts — pick one and use it consistently across all agents.
6. **Do not hide the "Connect" button when `status === 'connected'`.** Show "Reconnect" instead. A connected user may want to re-authorize with a different account. Hiding the control is surprising.
7. **The "Connect" flow in Phase 1 is mocked — make the mock believable.** After clicking "Connect", show a loading state for 1.5s (the artificial delay), then update the card. This gives the UI a realistic feel without real OAuth.
8. **Cards must not reflow when the status changes.** Reserve space for the token expiry warning with a `min-height` on the card body so the card doesn't jump when the warning appears or disappears.

---

### Agent 2 — `AdAccounts-List-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\adlist`
**Branch:** `ui/adaccounts-list`
**Screens:** Ad Accounts list page (`/ad-accounts`)

#### Responsibility

Build the `/ad-accounts` route — a table/card list of configured FB ad accounts with inline controls and navigation to the config form.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/ad-accounts/page.tsx
src/app/(dashboard)/ad-accounts/loading.tsx
src/components/ad-accounts/AdAccountsTable.tsx
src/components/ad-accounts/AdAccountRow.tsx
src/components/ad-accounts/AdAccountCard.tsx        (mobile card fallback)
src/components/ad-accounts/AdAccountEmptyState.tsx
src/components/ad-accounts/EnabledToggle.tsx
src/components/ad-accounts/RunNowButton.tsx
src/components/ad-accounts/LastRunBadge.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts          (adAccountsRouter.list, adAccountsRouter.toggleEnabled, adAccountsRouter.runNow)
src/lib/utils.ts
src/lib/constants.ts
src/components/ui/*
src/components/layout/*
```

#### Files You Must NOT Touch

All other agents' directories, `src/app/(dashboard)/ad-accounts/[id]/` (owned by AdAccount-Form-Agent).

#### Definition of Done

- [ ] **Loading:** Skeleton table with 3 rows matching real column widths. Use `<Skeleton>` components that preserve column layout.
- [ ] **Empty state:** Full-width centered card — icon, "No ad accounts configured", "Add your first ad account" button that navigates to `/ad-accounts/new`.
- [ ] **Error state:** Inline error with retry. Page chrome stays visible.
- [ ] **Success state:** Desktop = `<table>` with columns: Name, FB Account ID, Enabled toggle, Schedule, Last Run, Actions. Mobile (`< 768px`) = stack of `AdAccountCard` components.
- [ ] **Columns:** Name (links to `/ad-accounts/[id]`), FB Account ID (monospace, truncated), Enabled (toggle switch), Schedule (pretty-printed cron via `formatCron()`), Last Run (relative time + status badge), Actions (kebab menu: Edit, Run Now, Delete).
- [ ] **Enabled toggle:** Optimistic update — toggle immediately, call `toggleEnabled`, revert + toast on error.
- [ ] **Run Now:** Button in actions menu. Shows a spinner for the duration of the mocked call, then updates Last Run to "just now / running". Confirm dialog is NOT required for "Run Now" (it's non-destructive).
- [ ] **"Add ad account" button** in page header — navigates to `/ad-accounts/new`.
- [ ] **Sort:** Columns sortable by Name, Last Run (via URL `?sort=name&dir=asc`).
- [ ] **Keyboard:** Table rows navigable with arrow keys. Toggle activatable with Space. Kebab menu opens with Enter/Space and closes with Escape.
- [ ] **Responsive:** At `< 768px`, switch to card layout. Table is not horizontally scrollable — switch layouts instead.

#### UI/UX Best Practices — Ad Accounts List

1. **Skeleton rows must match real row height.** If a real row is 56px tall with a toggle and a badge, the skeleton row must also be 56px. Use `h-14` explicitly on skeleton rows, not `h-4` text-line skeletons that look nothing like the real rows.
2. **Optimistic UI for the Enabled toggle must handle the race condition.** If the user rapidly toggles on/off before the first call resolves, debounce or disable the toggle while the previous call is in-flight. A toggle that flickers back and forth on rapid clicks looks broken even when the underlying logic is correct.
3. **The kebab menu must not cause table row height to change when open.** Use a `Popover` with `position: absolute` so it overlays the table rather than pushing rows down. Never use a collapsible in-row action area.
4. **Last Run column should show two pieces of info in one cell.** Use a `LastRunBadge` component: top line = relative time ("3 hours ago"), bottom line = status badge (colored). Both fit in a single `flex-col` cell without truncation.
5. **"Run Now" in a menu is ambiguous — add a tooltip on the button itself** explaining "Trigger an immediate sync for this account." Tooltips should appear on keyboard focus too, not just hover.
6. **Empty state must be actionable, not just informational.** The CTA button in the empty state should be as prominent as the primary page action button (same size, same variant). A tiny link-style CTA in an empty state is easy to miss.
7. **Schedule column should degrade gracefully.** If an account has no schedule (Account C in mocks), show "No schedule" in muted text — not an empty cell, not a dash. Empty cells in data tables suggest loading or error.
8. **Mobile card layout must include the same actions as the desktop table.** Don't omit the enabled toggle or Run Now from the mobile card. Mobile users are first-class — they configure accounts from their phone too.
9. **Row hover and focus must have distinct visual states.** `hover:bg-muted/50` for hover, `ring-2 ring-primary` for keyboard focus. These must be visually distinguishable from each other.

---

### Agent 3 — `AdAccount-Form-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\adform`
**Branch:** `ui/adaccount-form`
**Screens:** Ad Account detail / config form (`/ad-accounts/[id]` and `/ad-accounts/new`)

#### Responsibility

Build the per-account configuration form — the most complex UI in the app. Both "new" and "edit" modes use the same form component.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/ad-accounts/[id]/page.tsx
src/app/(dashboard)/ad-accounts/[id]/loading.tsx
src/app/(dashboard)/ad-accounts/new/page.tsx
src/components/ad-accounts/form/AdAccountForm.tsx
src/components/ad-accounts/form/MetricsMultiSelect.tsx
src/components/ad-accounts/form/CronBuilder.tsx
src/components/ad-accounts/form/DateWindowSlider.tsx
src/components/ad-accounts/form/LevelCheckboxes.tsx
src/components/ad-accounts/form/FbAccountPicker.tsx
src/components/ad-accounts/form/FormSection.tsx
src/components/ad-accounts/form/UnsavedChangesGuard.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts          (adAccountsRouter.getById, adAccountsRouter.create, adAccountsRouter.update, fbRouter.listAvailableAccounts)
src/lib/utils.ts
src/lib/constants.ts            (FB_METRICS grouped object)
src/lib/mock-fb-accounts.ts
src/components/ui/*
src/components/layout/*
```

#### Files You Must NOT Touch

`src/app/(dashboard)/ad-accounts/page.tsx` and all other agents' directories.

#### Definition of Done

- [ ] **Loading:** Full-form skeleton — sections visible, field placeholders as grey bars, save button disabled.
- [ ] **Error (load):** If `getById` throws, show error with retry, keep breadcrumb visible.
- [ ] **Success (edit mode):** Form pre-populated from `getById(id)`.
- [ ] **Success (new mode):** Form starts with sensible defaults (levels = CAMPAIGN+AD, dateWindow = 7, enabled = false).
- [ ] **Fields:**
  - Label: text input, required, max 60 chars
  - FB Ad Account: `FbAccountPicker` — a `Command`-based searchable dropdown populated from `fbRouter.listAvailableAccounts()` (mocked 5 accounts). Shows account name + ID.
  - Levels: `LevelCheckboxes` — two checkboxes CAMPAIGN, AD. At least one must be selected (validate on submit).
  - Metrics: `MetricsMultiSelect` — grouped by Delivery / Cost / Conversion / Video. Searchable. Shows selected count as badge. At least one metric required.
  - Date window: `DateWindowSlider` — range 1–30 days, shows current value inline ("Last 7 days"). Snap to integer.
  - Spreadsheet ID: text input. Paste-friendly. Shows Google Sheets icon prefix.
  - Campaign tab name: text input, default "Campaigns".
  - Ad tab name: text input, default "Ads". Hidden if AD level not selected.
  - Schedule: `CronBuilder` — visual builder with frequency selector (hourly/daily/weekly/custom), time input, timezone `<Select>` (list of common timezones). Shows human-readable preview below: "Every day at 06:00 Tashkent time".
  - Enabled toggle: prominent switch at the top of the form.
- [ ] **Validation:** All required field errors appear next to the field (not in a banner). Validation runs on blur and on submit attempt.
- [ ] **Unsaved changes guard:** `UnsavedChangesGuard` — if the user navigates away with unsaved changes, show a `beforeunload` dialog (native) and an in-app `AlertDialog` if navigating via Next.js router.
- [ ] **Save / Discard:** Two buttons in a sticky footer bar (stays visible on scroll). "Discard" opens a confirm dialog if the form is dirty. "Save" calls `create` or `update`, shows loading state, then navigates back to list on success.
- [ ] **Form sections:** Divide form into named `FormSection` components: "Account Identity", "Data to Sync", "Destination", "Schedule". Each section has a heading and optional description.
- [ ] **Responsive:** On mobile, sections stack. Sticky footer remains accessible.

#### UI/UX Best Practices — Ad Account Form

1. **Divide the form into clear visual sections with headings, not a wall of fields.** A form with 12+ fields is overwhelming. Group related fields under named `FormSection` headings with a subtle divider. Users should be able to scan "I'm on the Destination section" without reading every field label.
2. **Validation errors must be field-adjacent, not in a banner.** Place the error message directly below the input with `role="alert"` and `aria-live="polite"`. A top-of-form error banner forces the user to scroll up, read the error, scroll back down to the field, and then try to remember which field has the issue.
3. **The metrics multi-select must show a selected-count badge at all times,** not just when the dropdown is open. A user should glance at the closed selector and know "5 metrics selected" without opening it. Implement as a trigger button: `"5 metrics selected ▾"`.
4. **The cron builder is the most foreign UI element on this page.** Always show the human-readable preview prominently below the builder inputs — "Runs every day at 06:00, Asia/Tashkent" in a `text-sm text-muted-foreground` block. Never leave the user guessing whether their cron expression is correct.
5. **The FB Account picker must work keyboard-first.** Use `Command` (shadcn cmdk wrapper): opens on focus, filters as user types, selects with Enter, closes with Escape. It should feel faster than a mouse for power users who already know their account IDs.
6. **The enabled toggle at the top of the form must have a visible label AND a state description.** Not just "Enabled" — "Syncing is active. This account will run on schedule." / "Syncing is paused." changes based on toggle state. Users should know the consequences of the toggle without reading documentation.
7. **The sticky footer save/discard bar must have a drop shadow or border to visually separate it from scrollable form content.** Without this visual separation, the form looks broken when the user scrolls — the buttons appear to float over the last field.
8. **Unsaved changes detection must track actual dirtiness, not just "the form was touched".** Compare current field values to initial values field by field. If the user types "x" then deletes "x", the form is no longer dirty — don't warn them. Use `react-hook-form`'s `isDirty` correctly.
9. **Date window slider should show the value while dragging,** not just when idle. Use a floating tooltip above the thumb that updates live: "Last 14 days". Without live feedback, sliders feel imprecise.
10. **Tab names should only appear when the corresponding level is checked.** "Ad tab name" only shows when AD is checked. Animate the reveal with `transition-all duration-150 overflow-hidden`. Hiding irrelevant fields reduces cognitive load without removing functionality.

---

### Agent 4 — `Runs-History-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\runs`
**Branch:** `ui/runs-history`
**Screens:** Runs / history page (`/runs`)

#### Responsibility

Build the `/runs` route — a paginated, filterable table of all sync runs across all accounts.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/runs/page.tsx
src/app/(dashboard)/runs/loading.tsx
src/components/runs/RunsTable.tsx
src/components/runs/RunRow.tsx
src/components/runs/RunStatusBadge.tsx
src/components/runs/RunsFilters.tsx
src/components/runs/RunsPagination.tsx
src/components/runs/RunsEmptyState.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts          (runsRouter.list with filters + pagination)
src/lib/utils.ts
src/components/ui/*
src/components/layout/*
```

#### Files You Must NOT Touch

`src/app/(dashboard)/runs/[id]/` (owned by Run-Detail-Agent) and all other agents' directories.

#### Definition of Done

- [ ] **Loading:** Skeleton table with 8 rows. Skeleton rows match real row height. Filter bar shows skeleton selects.
- [ ] **Empty state:** Shown when filters return 0 results. Two variants: (a) "No runs yet" when no filters applied — "Trigger a manual run from the Ad Accounts page." (b) "No runs match your filters" when filters applied — "Clear filters" button.
- [ ] **Error state:** Inline retry, page chrome visible.
- [ ] **Success state:** Table with columns: When (date + time, relative in tooltip), Account (name), Trigger (badge: "manual" / "scheduled"), Status (colored badge), Rows Written ("14C / 87A" = campaigns + ads), Duration, Error preview (truncated to 40 chars, links to detail).
- [ ] **Filters:** `RunsFilters` component — Account multi-select (populated from `MOCK_AD_ACCOUNTS`), Status multi-select (queued/running/success/failed). Filters live in URL params (`?account=a,b&status=success,failed`). Applying filters re-fetches immediately (no "Apply" button — instant filter).
- [ ] **Pagination:** 10 rows per page. URL param `?page=2`. `RunsPagination` shows first/prev/next/last buttons + "Page 2 of 4" text. Keyboard-navigable.
- [ ] **Clicking a row** navigates to `/runs/[id]`.
- [ ] **Running row** has a subtle animated pulse on the status badge to show it is live.
- [ ] **Responsive:** At `< 768px`, collapse "Rows Written" and "Duration" columns. Show essential columns only: When, Account, Status, quick-link to detail.

#### UI/UX Best Practices — Runs History

1. **Instant filter (no Apply button) must debounce the URL write, not the fetch.** Write the URL param immediately on selection change (so the URL is shareable), but debounce the actual data refetch by 150ms to avoid hammering on rapid multi-select changes.
2. **Status badge must never rely on color alone.** Every status badge must include a text label: "Success", "Failed", "Running", "Queued". Color reinforces the meaning; it does not replace it. Users with color blindness will thank you.
3. **The "running" row's animated pulse must respect `prefers-reduced-motion`.** Wrap the pulse animation in a `@media (prefers-reduced-motion: no-preference)` block. For users who prefer reduced motion, a static "Running" badge is fine.
4. **Truncating error messages in the table is correct, but the truncation must be obvious.** Use CSS `text-overflow: ellipsis` and a tooltip (`<Tooltip>` on hover) showing the full message. A 40-char cutoff without indication that there's more text is misleading.
5. **Pagination state belongs in the URL, not React state.** `?page=2` means the user can share a link to exactly this view, bookmark it, or refresh and land in the same place. React state for pagination is the wrong default in App Router.
6. **Empty state must distinguish "no data ever" from "no data matching filters".** These are completely different user situations. "No runs yet" calls for a next-step CTA. "No runs match your filters" calls for a "Clear filters" button. Showing the same empty state for both confuses the user about whether their data is missing or filtered out.
7. **The "When" column should show relative time ("3 hours ago") as the primary text and the absolute timestamp in a `<Tooltip>`.** Relative time answers the user's mental model ("was this recent?") better than an absolute timestamp. But power users need the absolute time too — hence the tooltip on hover/focus.
8. **"Rows written" column should show a breakdown, not just a total.** "14C / 87A" (campaigns / ads) is more useful than "101 rows" because the user configured separate campaign and ad tabs. If only one level was selected, show "14C" or "87A" alone.

---

### Agent 5 — `Run-Detail-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\rundetail`
**Branch:** `ui/run-detail`
**Screens:** Run detail page (`/runs/[id]`)

#### Responsibility

Build the `/runs/[id]` route — the single-run detail view with metadata, structured log timeline, and error display.

#### Files You OWN (exclusive write)

```
src/app/(dashboard)/runs/[id]/page.tsx
src/app/(dashboard)/runs/[id]/loading.tsx
src/components/runs/detail/RunDetailHeader.tsx
src/components/runs/detail/RunMetadataGrid.tsx
src/components/runs/detail/RunLogTimeline.tsx
src/components/runs/detail/RunLogEntry.tsx
src/components/runs/detail/RunErrorPanel.tsx
src/components/runs/detail/RunSheetsLink.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/api/root.ts          (runsRouter.getById, runLogsRouter.byRunId)
src/lib/utils.ts
src/components/runs/RunStatusBadge.tsx    (read-only, written by Runs-History-Agent)
src/components/ui/*
src/components/layout/*
```

#### Files You Must NOT Touch

`src/app/(dashboard)/runs/page.tsx` and all other agents' directories. Note: `RunStatusBadge.tsx` is shared — read it, do NOT edit it.

#### Definition of Done

- [ ] **Loading:** Skeleton: header area, 4-column metadata grid, log timeline with 5 skeleton entries.
- [ ] **Error (load):** Inline retry with back-navigation preserved.
- [ ] **Success (successful run):** Header (status badge, account name, trigger badge), metadata grid (started, finished, duration, rows written by level), "View in Google Sheets" button (`RunSheetsLink`), log timeline with INFO entries.
- [ ] **Success (failed run):** All of the above plus a prominent `RunErrorPanel` at the top of the log section — full error message in a red-bordered code block, stack trace if available (mocked). Log timeline shows INFO breadcrumbs leading up to the ERROR entry.
- [ ] **Log timeline:** `RunLogTimeline` renders `RunLogEntry` items chronologically. Each entry: timestamp (HH:mm:ss.SSS), level badge (INFO grey / WARN amber / ERROR red), message, and a collapsible `<details>` containing the JSON meta block (pretty-printed with syntax highlighting via a simple `<pre>` and monospace font — no external syntax highlighter required).
- [ ] **"View in Sheets" button:** Shown only if `run.sheetsUrl !== null`. Opens in new tab. Has `target="_blank" rel="noopener noreferrer"`. Shows Google Sheets icon.
- [ ] **Back navigation:** Breadcrumb: "Runs / Run #ABC123" at the top. "Back to runs" link preserves filter state via `referrer` or URL param.
- [ ] **Responsive:** Metadata grid is 4 columns desktop, 2 columns tablet, 1 column mobile. Log timeline is single column always.

#### UI/UX Best Practices — Run Detail

1. **The error panel must be scannable at a glance, not a wall of red text.** Use a structured `RunErrorPanel`: a one-line summary in bold at the top ("Error: FB API rate limit exceeded"), then the full error in a monospace `<pre>` block below in a scrollable container capped at `max-h-48 overflow-y-auto`. The user's first question is "what went wrong?" — answer it in one line before showing the raw output.
2. **Log entries must maintain visual hierarchy between levels.** INFO = default grey. WARN = amber text + amber left border. ERROR = red text + red left border + slightly heavier font weight. The visual weight of log levels must match their semantic importance so the user can skim 50 entries and spot the error instantly.
3. **JSON meta blocks should be collapsed by default.** Most log entries have null meta or small meta objects. Only 2–3 entries on a failed run have meaningful meta. Use `<details><summary>Show meta</summary><pre>...</pre></details>` — collapsed by default, keyboard-openable. Showing all meta expanded by default makes the timeline 5x longer for no reason.
4. **The log timeline must be keyboard-navigable.** Each `RunLogEntry` should be a semantic list item (`<li>` inside `<ul aria-label="Run log">`). The `<details>` within each entry is natively keyboard-accessible. Ensure focus order is correct.
5. **"View in Sheets" is a reward for a successful run — style it accordingly.** Use the `default` button variant with a Google Sheets green left icon (or any recognizable Sheets-flavored icon from Lucide). This CTA should feel positive and celebratory compared to the neutral actions on other pages.
6. **Duration in the metadata grid must be human-readable.** Use `formatDuration(ms)` — "12.4s", "1m 03s" — not raw milliseconds. A run that took 3847ms should show "3.8s".
7. **The back-navigation breadcrumb must work correctly after a page refresh.** Do not rely solely on `router.back()` — if the user navigated directly to the run detail URL, `back()` would navigate off-app. Always include a hard `href="/runs"` link in the breadcrumb.

---

### Agent 6 — `Settings-Login-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\settings`
**Branch:** `ui/settings-login`
**Screens:** Login page (`/login`) and Settings page (`/settings`)

#### Responsibility

Build the `/login` route (auth entry point UI) and the `/settings` route (user profile + preferences + danger zone).

#### Files You OWN (exclusive write)

```
src/app/login/page.tsx
src/app/(dashboard)/settings/page.tsx
src/app/(dashboard)/settings/loading.tsx
src/components/auth/LoginCard.tsx
src/components/auth/AllowlistGate.tsx
src/components/settings/ProfileSection.tsx
src/components/settings/ThemeSection.tsx
src/components/settings/TimezoneSection.tsx
src/components/settings/DangerZone.tsx
src/components/settings/DeleteDataDialog.tsx
```

#### Files You May READ (do not write)

```
src/server/mocks/types.ts
src/server/mocks/data.ts
src/server/mocks/session.ts
src/server/api/root.ts          (settingsRouter.get, settingsRouter.updateTheme, settingsRouter.updateTimezone, settingsRouter.deleteAllData, authRouter.getSession)
src/lib/utils.ts
src/components/providers/ThemeProvider.tsx
src/components/ui/*
src/components/layout/*
```

#### Files You Must NOT Touch

All other agents' directories, `src/app/(dashboard)/layout.tsx`.

#### Definition of Done

**Login page:**
- [ ] Centered card, 400px max-width, vertically centered in viewport.
- [ ] Google sign-in button with Google logo (use inline SVG or a Lucide workaround — no external icon CDN).
- [ ] Subtext: "Access is restricted to approved accounts."
- [ ] `AllowlistGate` component: if the mocked session returns `allowlisted: false`, show a separate card: "Your account isn't on the access list. Contact the administrator."
- [ ] Dark mode compatible. Clean, minimal. No distracting graphics.
- [ ] The sign-in button is the only focusable element (besides potential skip-to-content). Tab order: sign-in button.

**Settings page:**
- [ ] **Loading:** Skeleton for each section.
- [ ] **Error:** Retry inline.
- [ ] **Success:** Four sections:
  - `ProfileSection` — avatar (initials fallback), name, email (read-only, from mocked session). No editing in Phase 1.
  - `ThemeSection` — three-way toggle: Light / Dark / System. Calls `settingsRouter.updateTheme(theme)`. Immediate optimistic update — theme must actually switch via the ThemeProvider.
  - `TimezoneSection` — a searchable select of common timezones (hardcoded list: ~20 timezones covering major regions). Saves on blur. Shows current timezone's current time as a preview below: "Currently 14:32 in Asia/Tashkent".
  - `DangerZone` — red-bordered section at the bottom. Single action: "Delete all data". Opens `DeleteDataDialog`.
- [ ] `DeleteDataDialog`: `AlertDialog` with "This will permanently delete all ad accounts, runs, and logs. This cannot be undone." Focus on "Cancel" by default. "Delete everything" button is red and requires the user to type "DELETE" in a text input before it activates. Calls `settingsRouter.deleteAllData()` on confirm. In Phase 1, the mock call succeeds and the dialog closes with a success toast.
- [ ] **Responsive:** Sections stack on mobile. Full-width on mobile.

#### UI/UX Best Practices — Settings & Login

1. **The login page must be the simplest page in the app.** One card, one button, one sentence of context. No navigation, no sidebar, no top bar. The user arrives here with one job: log in. Every additional element is friction.
2. **Google sign-in button must match Google's branding guidelines even in a mock.** Use the correct Google blue (`#4285F4`), the Google "G" logo SVG, and white button text. A generic "Login" button with no Google branding breaks trust immediately — users expect to recognize the OAuth provider.
3. **The theme toggle must provide immediate visual feedback, not a spinner.** When the user clicks "Dark", the entire page must switch to dark mode instantly. If you need to call the API (even mocked), do it fire-and-forget — update the ThemeProvider state immediately and let the API call catch up. A theme that switches 600ms later feels broken.
4. **The Danger Zone must be visually separated from the rest of the settings page.** Use a red-bordered `<section>` with a "Danger Zone" heading in red. Scroll position should require the user to deliberately scroll to reach it — do not position it near the top. Visual distance adds a psychological speed bump.
5. **"Type DELETE to confirm" dialogs must disable the confirm button until the exact string is typed.** Use `input.value === 'DELETE'` — case-sensitive. This pattern is industry-standard (GitHub uses it) because it forces conscious intent, not just clicking through. The input must be auto-focused when the dialog opens.
6. **The timezone preview ("Currently 14:32 in Asia/Tashkent") must update every minute.** Use a `useEffect` with a `setInterval(fn, 60000)` to refresh the displayed current time. A stale time display (showing a time from when the page loaded) is confusing and erodes trust in the setting's accuracy.
7. **Allowlist gating must show a helpful, human message — not an error.** "Your account isn't on the access list. Contact the administrator." is clear. "Error 403: Forbidden" is not. Phase 1 uses a mocked allowlist; Phase 2 will check real email. Write the copy assuming the user is a real person who legitimately expected access.
8. **Settings sections must save in isolation.** If the theme toggle call fails, it must not affect the timezone selector or vice versa. Each section's save/fail state is self-contained. A global "Settings saved!" toast is acceptable, but a global "Settings failed!" toast with no indication of which setting failed is harmful.

---

## Stage 2 — Merge & Integration (orchestrator, after all subagents finish)

> Run this stage only after all 6 subagents have committed to their branches.

### 2.1 — Merge order (conflict-free by file ownership)

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root checkout main

# Merge in this order — no file overlaps between any two consecutive merges
git -C $root merge --no-ff ui/settings-login    -m "merge: settings + login UI"
git -C $root merge --no-ff ui/connections-ui    -m "merge: connections UI"
git -C $root merge --no-ff ui/adaccounts-list   -m "merge: ad accounts list UI"
git -C $root merge --no-ff ui/adaccount-form    -m "merge: ad account form UI"
git -C $root merge --no-ff ui/runs-history      -m "merge: runs history UI"
git -C $root merge --no-ff ui/run-detail        -m "merge: run detail UI"
```

If any merge conflict occurs, it means a subagent wrote outside its assigned files — identify the file, revert it in the agent's branch, and re-merge.

### 2.2 — Wire sidebar navigation

In `src/components/layout/Sidebar.tsx`, confirm all links resolve:

```
/connections       → Connections page
/ad-accounts       → Ad Accounts list
/runs              → Runs history
/settings          → Settings
/login             → Login (unauthenticated redirect)
```

### 2.3 — Typecheck and lint

```powershell
pnpm typecheck
pnpm lint
```

Fix all errors before proceeding. No `// @ts-ignore` or `eslint-disable` suppressions unless the suppression existed before the parallel stage.

### 2.4 — Accessibility check

```powershell
pnpm dlx @axe-core/cli http://localhost:3000/connections
pnpm dlx @axe-core/cli http://localhost:3000/ad-accounts
pnpm dlx @axe-core/cli http://localhost:3000/runs
pnpm dlx @axe-core/cli http://localhost:3000/settings
pnpm dlx @axe-core/cli http://localhost:3000/login
```

Zero critical or serious violations allowed. Fix before proceeding.

### 2.5 — Lighthouse

Run Lighthouse on each route in both light and dark mode. Thresholds:

| Route | Performance | Accessibility | Best Practices |
|---|---|---|---|
| `/login` | ≥ 95 | ≥ 95 | ≥ 90 |
| `/connections` | ≥ 90 | ≥ 95 | ≥ 90 |
| `/ad-accounts` | ≥ 90 | ≥ 95 | ≥ 90 |
| `/ad-accounts/new` | ≥ 90 | ≥ 95 | ≥ 90 |
| `/runs` | ≥ 90 | ≥ 95 | ≥ 90 |
| `/runs/[id]` | ≥ 90 | ≥ 95 | ≥ 90 |
| `/settings` | ≥ 90 | ≥ 95 | ≥ 90 |

### 2.6 — Screenshots

```powershell
# Ensure docs/screenshots/ directory exists
New-Item -ItemType Directory -Force -Path docs/screenshots

# Take screenshots at 1440x900 (desktop) and 375x812 (mobile) in light and dark
# Use Playwright or any headless browser
# Naming convention: {route}-{theme}-{breakpoint}.png
# Example: connections-dark-desktop.png, runs-light-mobile.png
```

Commit screenshots to `docs/screenshots/` in a final commit:

```powershell
git add docs/screenshots/
git commit -m "docs: Phase 1 UI screenshots (light + dark, desktop + mobile)"
```

### 2.7 — Remove worktrees

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree remove .worktrees/connections
git -C $root worktree remove .worktrees/adlist
git -C $root worktree remove .worktrees/adform
git -C $root worktree remove .worktrees/runs
git -C $root worktrees remove .worktrees/rundetail
git -C $root worktree remove .worktrees/settings
```

---

## Phase 1 Acceptance Checklist

The orchestrator confirms each item before declaring Phase 1 complete.

### Routes

- [ ] `/login` — login card renders, Google button visible, allowlist gate works
- [ ] `/connections` — 2 provider cards, connect/disconnect/reconnect, token expiry warning
- [ ] `/ad-accounts` — table with 3 mock accounts, toggle, run now, sort
- [ ] `/ad-accounts/new` — empty form, all fields, save navigates to list
- [ ] `/ad-accounts/[id]` — form pre-populated from mock, save + discard work
- [ ] `/runs` — paginated table, filters by account + status, 30 mock runs
- [ ] `/runs/[id]` — metadata grid, log timeline, error panel for failed runs
- [ ] `/settings` — profile, theme, timezone, danger zone

### 4 States Per Route

- [ ] Every route has a `loading.tsx` with a skeleton that matches real layout dimensions
- [ ] Every route has a visible, actionable empty state
- [ ] Every route has an error state with a working retry
- [ ] Every route has a success/data state with realistic mock data

### Accessibility

- [ ] Zero critical/serious axe violations on all routes
- [ ] All interactive elements reachable and operable by keyboard
- [ ] All focus rings visible (`ring-2 ring-primary` or equivalent)
- [ ] All status indicators have text labels (not color-only)
- [ ] All dialogs trap focus correctly
- [ ] `prefers-reduced-motion` respected on all animations

### Responsive

- [ ] All routes functional and non-overflowing at 375px width
- [ ] Table → card layout switches happen at the right breakpoints
- [ ] All tap targets ≥ 44px on mobile
- [ ] Sticky footers accessible on mobile (not obscured by browser chrome)

### Dark Mode

- [ ] Theme toggle works on Settings page
- [ ] All routes render correctly in dark mode (no white flashes, no missing backgrounds)
- [ ] All WCAG AA contrast ratios maintained in dark mode
- [ ] Screenshots committed for both themes

### Lighthouse

- [ ] All routes meet or exceed the thresholds in Stage 2.5

---

## Explicit "Do NOT" List

These are absolute constraints across all agents and the orchestrator:

- **Do NOT call real Facebook Graph API, Google Sheets API, or any external HTTP endpoint.** All data comes from `src/server/mocks/data.ts`.
- **Do NOT write Prisma schema changes or migrations.** `prisma/` is out of scope for Phase 1.
- **Do NOT add NextAuth providers or configure real OAuth callbacks.** Use `getMockSession()` from `src/server/mocks/session.ts`.
- **Do NOT introduce Redux, Zustand, Jotai, Recoil, or any global state library.** Server components + tRPC + URL search params are the state layer.
- **Do NOT add `// @ts-ignore` or `eslint-disable` without a comment explaining why it cannot be avoided.**
- **Do NOT add unrequested pages or components.** If you think a new shared component is needed, stop and request it via the orchestrator — do not create it in a shared directory unilaterally.
- **Do NOT use `<img>` for icons.** Use Lucide React or inline SVG.
- **Do NOT commit `.env` files, API keys, or secrets** of any kind.
- **Do NOT use `any` type in TypeScript.** Use `unknown` or properly type everything.
- **Do NOT ship console.log statements.** Remove all debug logging before committing.

---

## Each Subagent's Final Report Must Include

Before the orchestrator merges a branch, confirm the subagent's final commit message includes (or the agent explicitly states):

1. List of files written (paths)
2. Screens completed
3. Any items skipped and why (be specific — if a feature was skipped, the orchestrator needs to know)
4. Confirmation that `pnpm typecheck` passes in the worktree
5. Confirmation that the screens render correctly at 375px and 1440px (visual check, not just no errors)
