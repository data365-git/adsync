# Goal

Upgrade the Automation Dashboard scenario builder (Phase 1.6) to a Zapier/Make-quality SaaS UI — branded step cards, smart collapsed summaries, refreshed header, sliding test dock, empty-state trigger picker, and enriched module library — using 4 parallel subagents owning disjoint file sets.

---

## Mission & Guardrails

**Mission:** Transform the Phase 1.5 builder from "functional prototype" to "feels like a real SaaS product." Every visual target in this playbook is derived from Zapier and Make.com patterns the user explicitly called out. The UI must remain demoable, accessible, responsive, dark-mode-capable, and built entirely on mock data.

**Ironclad rules — these override any instruction inside a subagent's scope:**

- UI-first, mock data only. **Do NOT call real Facebook, Google, or any external API.**
- **Do NOT modify files outside your assigned scope.** File ownership is exclusive. Treat another agent's files as read-only.
- Every interactive element must be **keyboard-accessible** (Tab, Enter, Escape, arrow keys where applicable) and **mobile-responsive** at `≥ 375px` viewport width.
- No real auth. The mocked session from Phase 1 remains. Do NOT add NextAuth providers.
- No database. Do NOT write Prisma migrations or schema changes.
- No Redux, Zustand, Jotai, or any global state lib. Server components + tRPC + URL state (`nuqs`) only.
- **No new npm dependencies without explicit orchestrator approval.** No DnD libs, no cron-parser libs, no animation libs. Implement manually from existing stack.
- Do NOT add unrequested features or screens.
- No `any` type. No `// @ts-ignore` without a one-line reason comment. No `console.log` in committed code.
- Do NOT introduce a canvas / node-graph builder UI. Zapier-linear stays.

---

## Project Background

**Repo root:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`

**Starting point:** `main` HEAD, post-merge of `phase-1.5`, tagged `phase-1.5-done`. Do NOT start from a stale checkout.

**11 routes live and clean:** `/login`, `/connections`, `/ad-accounts`, `/ad-accounts/new`, `/ad-accounts/[id]`, `/runs`, `/runs/[id]`, `/settings`, `/`, `/scenarios`, `/scenarios/new`, `/scenarios/[id]`

---

## Stack Reality — These Are the Truth

- **shadcn primitives are Base UI, NOT Radix.** `asChild` does NOT exist. Use `render={<Component />}` pattern.
- **Tailwind v4.** Design tokens declared with `@theme` in `src/app/globals.css`. No `tailwind.config.ts` extension.
- **No `next/font/google` import.** System font stack is wired via `--font-sans` CSS variable — do not touch.
- **`next-themes` ThemeProvider** uses a `React.createElement` workaround. Already wired in `src/app/layout.tsx`. Black box — do NOT edit.
- **`NuqsAdapter` is wired in root layout.** Agents may use `nuqs` freely without setup.
- **pnpm 9.15.9** (pinned). Node 22.14.
- **`node_modules` lives inside OneDrive.** Do not delete or recreate it.
- **Dev server** runs on port 3000 if free, else 3002. Read the actual port from boot output.
- **`styled-jsx`** is a direct dep — do not remove.
- **Next.js 15, React 19.**

---

## Frozen Files (Phase 1 + 1.5 — do NOT edit during Stage 1')

```
src/components/ui/*
src/components/layout/*
src/components/providers/*
src/server/api/root.ts
src/server/api/routers/*
src/server/mocks/*
src/lib/*                          (except: Stage 0' edits modules.ts once, then re-freezes;
                                    integration-icons.tsx and cron-builder.ts are NEW files,
                                    not frozen — they are created in Stage 0' and then readable)
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/runs/*
src/app/(dashboard)/ad-accounts/*
src/components/runs/*
src/components/ad-accounts/*
src/components/scenarios/ScenarioRow.tsx
src/components/scenarios/ScenarioCard.tsx
src/components/scenarios/ScenariosEmptyState.tsx
src/components/scenarios/QuickSetupBanner.tsx
src/components/scenarios/ScenarioEnabledToggle.tsx
src/components/scenarios/ScenarioRunNowButton.tsx
src/components/scenarios/ScenarioKindBadge.tsx
src/components/scenarios/ScenariosClient.tsx
```

Stage 0' grants a one-time edit window on a defined subset. After the Stage 0' commit, the edited files re-freeze.

---

## Visual Targets — Bake These Into Your Work

### Step card — collapsed state

**Phase 1.5 (today):**
```
┌──────────────────────────────────────────────────┐
│ ① ⏱ Schedule                              v · ⋮  │
│      Run on a recurring schedule via cron        │
└──────────────────────────────────────────────────┘
```

**Phase 1.6 target:**
```
┌──────────────────────────────────────────────────┐
│ [🕒]  Schedule · Every day at 07:00         ✓   │
│  blue  Asia/Tashkent (UZT)                v · ⋮  │
└──────────────────────────────────────────────────┘
```
- Brand-colored icon tile on the left (16×16 icon inside a 36×36 rounded tile with `bg-<brand>/10`)
- Module name + **configured summary** on the same line, separated by `·`
- Second line: human-readable config detail (timezone, date window, sheet name)
- Status pill top-right: `✓ Ready` (green) / `⚠ Needs config` (amber) / `◯ Empty` (slate)
- Entire card is the click target (expand/collapse), not just the chevron

### Step card — expanded state

**Top of expanded card** = "What this does" description strip using `MODULES[moduleType].description`.

**Body** = the existing config form, plus inline help text below every required field label (Zapier-style plain text, not tooltips).

**Bottom of expanded card** = two tabs: `Configure` (default, existing form) and `Sample` (3-row × ≤5-column read-only mini-table of `MODULES[moduleType].sampleOutput`).

### Builder header

**Phase 1.5 (today):**
```
← Multi-account daily roundup    [enabled ●] [Test] [Save]
```

**Phase 1.6 target:**
```
← Scenarios / Multi-account daily roundup
   Daily at 07:00 → Get Account Insights → Append Rows
   ─────────────────────────────────────────────────────
   ● Enabled · Next run in 2h 14m              [Test] [Run now] [Save]
   30 runs · 26 succeeded · 4 failed
```

### Empty state — scratch scenario

**Phase 1.5 (today):** Empty trigger card + `+ Add step` button.

**Phase 1.6 target:**
```
┌─────────────────────────────────────────────────┐
│  Step 1: When this happens...                   │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ [🕒] slate   │  │ [⚡] indigo  │             │
│  │  Schedule    │  │  Manual      │             │
│  │  Run on cron │  │  Trigger by  │             │
│  │              │  │  hand        │             │
│  └──────────────┘  └──────────────┘             │
│  Pick a trigger to start your scenario.         │
└─────────────────────────────────────────────────┘
```

### Test panel

**Phase 1.5 (today):** Inline `<details>` with raw JSON below step list.

**Phase 1.6 target:** Sliding bottom dock (~280px tall, fixed position, full builder width). Header: "Test results · N of M steps succeeded · Xms total" + Close button. Per-step row: brand icon tile + name + duration + ✓/✗. Click row → 3-row × ≤5-col mini-table preview. Click again or Esc → collapse row detail. Slides up on open, slides down on close; `prefers-reduced-motion` → fade only, no slide.

### Module library modal

**Phase 1.6 target:**
```
┌────── Choose a module ──────────────── [×] ┐
│  [search input — auto-focused]              │
│                                              │
│  Triggers                                    │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ [🕒] slate  │  │ [⚡] indigo │           │
│  │ Schedule    │  │ Manual run  │           │
│  │ Run on cron │  │ Trigger by  │           │
│  └─────────────┘  └─────────────┘           │
│                                              │
│  [📘] Facebook Ads                           │
│  ┌─────────────┐  ┌─────────────┐  ...      │
│  │ Get Account │  │ Get Campaign │           │
│  │ Insights    │  │ Insights     │           │
│  └─────────────┘  └─────────────┘           │
│                                              │
│  [📊] Google Sheets                          │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ Append Rows │  │ Upsert Rows │           │
│  └─────────────┘  └─────────────┘           │
└──────────────────────────────────────────────┘
```
- Branded section headers: integration icon + colored left-border bar
- Each module card: brand-colored icon tile, name, 1-line description
- Click anywhere on the card to select
- Search hides sections with zero visible results
- Hover state: `border-primary/40 shadow-sm`

### TemplatePicker

**Phase 1.6 target:** 3 existing template cards (brand-colored icon tile per template's terminal action: Sheets terminus → green tile, etc.) + 4th equal-weight card "Build from scratch" with dashed border, `+` icon, generic muted tile. Routes to `/scenarios/new?template=scratch`.

---

## Stage 0' — Sequential Setup (Orchestrator Only)

> **Run Stage 0' alone on the `main` branch. Do NOT spawn subagents until the Stage 0' commit is verified.**

Stage 0' provides shared lib files all 4 agents need, hot-fixes two bugs, and defines the visual tokens that give Phase 1.6 its brand identity.

### 0'.1 — Branch

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root checkout main
git -C $root pull
git -C $root checkout -b phase-1.6
```

Confirm you are at the `phase-1.5-done` tag before proceeding.

### 0'.2 — Hot fix: from-scratch navigation bug

**File:** `src/components/scenarios/builder/TemplatePicker.tsx` ~line 24

```diff
- router.push("/scenarios/new");
+ router.push("/scenarios/new?template=scratch");
```

This fixes the navigation loop where "Build from scratch" kept cycling back to the template picker instead of opening an empty builder.

### 0'.3 — Hot fix: scenario-detail loading flash

**File:** `src/app/(dashboard)/scenarios/[id]/page.tsx`

The 1.5s white flash fires because the loading boundary triggers during route transition but the artificial 600ms tRPC delay lands after hydration. Fix: have `ScenarioDetailClient` show the skeleton itself while `useQuery({ isPending })` is true, rather than relying on the `loading.tsx` boundary alone.

In `src/app/(dashboard)/scenarios/[id]/ScenarioDetailClient.tsx` (Agent C's file — this is a Stage 0' pre-edit before the file is handed to Agent C in Stage 1'):

```tsx
// At the top of the component body, before the main return:
if (isPending) {
  return <ScenarioDetailSkeleton />;   // import from './loading'
}
```

Create `src/app/(dashboard)/scenarios/[id]/ScenarioDetailSkeleton.tsx` (new file, mirrors `loading.tsx`'s inner skeleton JSX without the page wrapper). Import it in both `loading.tsx` and `ScenarioDetailClient.tsx`.

**After Stage 0', `ScenarioDetailClient.tsx` re-freezes except for Agent C's owned edits.**

### 0'.4 — Add Tailwind v4 color tokens

**File:** `src/app/globals.css`

Inside the existing `@theme {}` block (or create one adjacent to existing tokens):

```css
@theme {
  /* Phase 1.6 brand tokens */
  --color-fb-blue: #1877F2;
  --color-sheets-green: #0F9D58;
  --color-schedule-slate: oklch(0.554 0.046 257.417);  /* slate-500 equivalent */
  --color-manual-indigo: #6366f1;
}
```

After this, `bg-fb-blue/10`, `text-fb-blue`, `bg-sheets-green/10`, etc. all work as Tailwind utility classes. No dark-mode overrides needed — these are brand colors, legible on dark backgrounds.

Verify by running `pnpm dev` and inspecting that a test element with `className="bg-fb-blue"` renders blue.

### 0'.5 — Create `src/lib/integration-icons.tsx`

New file. Export brand-colored SVG icon components for each integration, plus a lookup function.

```typescript
import type { SVGProps, ComponentType } from 'react'
import { Clock, Zap } from 'lucide-react'
import type { ModuleType } from '@/server/mocks/types'

export const FacebookIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} {...props}>
    {/* Official Facebook "f" mark — single path */}
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
)

export const GoogleSheetsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={24} height={24} {...props}>
    {/* Google Sheets tabbed-sheet mark */}
    <path d="M11.318 0H3.27A1.636 1.636 0 001.636 1.636v20.728A1.636 1.636 0 003.27 24h17.455a1.636 1.636 0 001.636-1.636V11.318zm4.09 13.773H8.59v-1.637h6.818zm0 3.272H8.59V15.41h6.818zm0 3.273H8.59v-1.637h6.818zm2.046-11.318h-5.182V4.364l5.182 5.182v-.036z" />
  </svg>
)

export const ScheduleIcon = (props: SVGProps<SVGSVGElement>) => (
  <Clock {...(props as React.ComponentProps<typeof Clock>)} />
)

export const ManualIcon = (props: SVGProps<SVGSVGElement>) => (
  <Zap {...(props as React.ComponentProps<typeof Zap>)} />
)

export type IntegrationTone = 'fb-blue' | 'sheets-green' | 'schedule-slate' | 'manual-indigo'

export function getIntegrationMeta(moduleType: ModuleType): {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: IntegrationTone
  tileBg: string    // Tailwind class string — e.g. 'bg-fb-blue/10'
  iconColor: string // Tailwind class string — e.g. 'text-fb-blue'
} {
  if (moduleType === 'trigger.schedule') {
    return { Icon: ScheduleIcon, tone: 'schedule-slate', tileBg: 'bg-schedule-slate/10', iconColor: 'text-schedule-slate' }
  }
  if (moduleType === 'trigger.manual') {
    return { Icon: ManualIcon, tone: 'manual-indigo', tileBg: 'bg-manual-indigo/10', iconColor: 'text-manual-indigo' }
  }
  if (moduleType.startsWith('fb.')) {
    return { Icon: FacebookIcon, tone: 'fb-blue', tileBg: 'bg-fb-blue/10', iconColor: 'text-fb-blue' }
  }
  // sheets.*
  return { Icon: GoogleSheetsIcon, tone: 'sheets-green', tileBg: 'bg-sheets-green/10', iconColor: 'text-sheets-green' }
}
```

The icon tile pattern for callers:
```tsx
const { Icon, tileBg, iconColor } = getIntegrationMeta(step.moduleType)
// Render:
<div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tileBg)}>
  <Icon className={cn('h-4 w-4', iconColor)} />
</div>
```

### 0'.6 — Create `src/lib/cron-builder.ts`

New file. Provide the 4 functions all agents need. **Paste the full implementation below** so no agent has to re-derive it.

```typescript
export type Frequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'advanced'

export interface CronInput {
  frequency: Frequency
  hour?: number        // 0–23
  minute?: number      // 0–59
  daysOfWeek?: number[] // 0=Sun … 6=Sat (weekly only)
  dayOfMonth?: number  // 1–31 (monthly only)
  customExpression?: string
}

export interface ParsedCron {
  frequency: Frequency
  hour?: number
  minute?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  raw: string
}

/** Build a cron expression string from structured input. */
export function buildCron(input: CronInput): string {
  const { frequency, hour = 0, minute = 0, daysOfWeek = [], dayOfMonth = 1, customExpression = '' } = input
  switch (frequency) {
    case 'hourly':   return `${minute} * * * *`
    case 'daily':    return `${minute} ${hour} * * *`
    case 'weekly': {
      const days = daysOfWeek.length > 0 ? daysOfWeek.join(',') : '1'
      return `${minute} ${hour} * * ${days}`
    }
    case 'monthly':  return `${minute} ${hour} ${dayOfMonth} * *`
    case 'advanced': return customExpression.trim()
    default:         return customExpression.trim()
  }
}

/**
 * Parse a cron expression back to a structured object.
 * Returns null if the expression cannot be mapped to one of our 4 named frequencies
 * (the caller should fall back to 'advanced' mode in that case).
 *
 * Scope: only parses the patterns we generate with buildCron.
 * Does NOT attempt to parse arbitrary cron syntax.
 */
export function parseCron(expr: string): ParsedCron | null {
  if (!expr || typeof expr !== 'string') return null
  const raw = expr.trim()
  const parts = raw.split(/\s+/)
  if (parts.length !== 5) return null
  const [min, hr, dom, , dow] = parts

  const minute = parseInt(min ?? '', 10)
  const hour   = parseInt(hr  ?? '', 10)
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null

  // hourly: "N * * * *"
  if (hr === '*' && dom === '*' && dow === '*') {
    return { frequency: 'hourly', minute, raw }
  }
  // daily: "N H * * *"
  if (dom === '*' && dow === '*') {
    return { frequency: 'daily', hour, minute, raw }
  }
  // weekly: "N H * * D[,D...]"
  if (dom === '*' && dow !== '*') {
    const daysOfWeek = dow.split(',').map(Number).filter(n => !Number.isNaN(n))
    return { frequency: 'weekly', hour, minute, daysOfWeek, raw }
  }
  // monthly: "N H D * *"
  if (dom !== '*' && dow === '*') {
    const dayOfMonth = parseInt(dom ?? '', 10)
    if (Number.isNaN(dayOfMonth)) return null
    return { frequency: 'monthly', hour, minute, dayOfMonth, raw }
  }
  // Unrecognised pattern — caller must fall back to advanced
  return null
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Return a short human-readable description of a cron expression. */
export function humanizeCronShort(expr: string): string {
  const parsed = parseCron(expr)
  if (!parsed) return 'Custom schedule'
  const pad = (n: number) => String(n).padStart(2, '0')
  switch (parsed.frequency) {
    case 'hourly':
      return 'Every hour'
    case 'daily':
      return `Daily at ${pad(parsed.hour ?? 0)}:${pad(parsed.minute ?? 0)}`
    case 'weekly': {
      const days = (parsed.daysOfWeek ?? [1])
        .map(d => DAY_NAMES[d] ?? '?')
        .join(', ')
      return `Weekly ${days} at ${pad(parsed.hour ?? 0)}:${pad(parsed.minute ?? 0)}`
    }
    case 'monthly':
      return `Monthly on day ${parsed.dayOfMonth ?? 1} at ${pad(parsed.hour ?? 0)}:${pad(parsed.minute ?? 0)}`
    default:
      return 'Custom schedule'
  }
}

/**
 * Compute the next fire time for a cron expression.
 * Returns null if the expression cannot be parsed or the next fire time
 * is more than 31 days away (guard against runaway loops).
 *
 * Implementation: brute-force minute-by-minute scan from `from` up to 31 days.
 * Adequate for our 4 named patterns; custom schedules return null.
 */
export function nextFireAt(expr: string, _timezone: string, from: Date = new Date()): Date | null {
  const parsed = parseCron(expr)
  if (!parsed || parsed.frequency === 'advanced') return null

  const MAX_ITERATIONS = 60 * 24 * 31 // 31 days in minutes
  const candidate = new Date(from)
  // Round up to the next whole minute
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const m = candidate.getMinutes()
    const h = candidate.getHours()
    const d = candidate.getDate()
    const dow = candidate.getDay()

    let matches = false
    switch (parsed.frequency) {
      case 'hourly':
        matches = m === (parsed.minute ?? 0)
        break
      case 'daily':
        matches = h === (parsed.hour ?? 0) && m === (parsed.minute ?? 0)
        break
      case 'weekly':
        matches = (parsed.daysOfWeek ?? [1]).includes(dow) &&
                  h === (parsed.hour ?? 0) &&
                  m === (parsed.minute ?? 0)
        break
      case 'monthly':
        matches = d === (parsed.dayOfMonth ?? 1) &&
                  h === (parsed.hour ?? 0) &&
                  m === (parsed.minute ?? 0)
        break
    }
    if (matches) return new Date(candidate)
    candidate.setMinutes(candidate.getMinutes() + 1)
  }
  return null
}
```

**Note on timezone:** The `_timezone` param is accepted for API compatibility but is not used in Phase 1.6 — all computations are in local time. Phase 2 should swap this for a proper `Intl`-based implementation.

### 0'.7 — Augment `src/lib/modules.ts` — add `shortName` field (one-time edit)

`modules.ts` is a Phase-1.5-frozen file. This is its single permitted Stage-0' edit. After this commit, it re-freezes.

Add `shortName` to each `ModuleDef` type and each module entry:

```typescript
// In the ModuleDef type:
shortName: string   // compact name used in the auto-summary subtitle

// Entries:
'trigger.schedule':    { ..., shortName: 'Schedule' }
'trigger.manual':      { ..., shortName: 'Manual' }
'fb.account_insights': { ..., shortName: 'Get Account Insights' }
'fb.campaign_insights':{ ..., shortName: 'Get Campaign Insights' }
'fb.ad_insights':      { ..., shortName: 'Get Ad Insights' }
'sheets.append':       { ..., shortName: 'Append Rows' }
'sheets.upsert':       { ..., shortName: 'Upsert Rows' }
```

Also confirm that every module entry has a `sampleOutput` field with at least 3 rows of realistic mock data (should exist from Phase 1.5 — if any entry is missing it, add a plausible fixture now so Agent B's Sample tab has data to render).

### 0'.8 — Typecheck, lint, commit

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
pnpm typecheck
pnpm lint
git -C $root add `
  src/components/scenarios/builder/TemplatePicker.tsx `
  src/app/(dashboard)/scenarios/[id]/ScenarioDetailClient.tsx `
  src/app/(dashboard)/scenarios/[id]/ScenarioDetailSkeleton.tsx `
  src/app/globals.css `
  src/lib/integration-icons.tsx `
  src/lib/cron-builder.ts `
  src/lib/modules.ts
git -C $root commit -m "phase 1.6 stage 0': bug fixes, integration icons, cron builder, color tokens, modules.shortName"
```

> **Stage 0' is complete. Verify before spawning subagents:**
> - `pnpm dev` boots without errors
> - Navigate to `/scenarios/new`, click "Build from scratch" → lands in empty builder (bug fix verified)
> - Navigate to `/scenarios/scn_custom_01` → skeleton fires from t=0, no white flash
> - `src/app/globals.css` contains the new `--color-fb-blue` etc. tokens
> - `src/lib/integration-icons.tsx` exists with named exports
> - `src/lib/cron-builder.ts` exists with named exports
> - `pnpm typecheck` exits 0

---

## Stage 1' — Parallel Subagents (4)

> Spawn all 4 agents simultaneously after Stage 0' is committed and verified. Each runs in its own git worktree.

### Worktree Setup (orchestrator runs before dispatching)

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree add .worktrees/sched     phase16/schedule-picker
git -C $root worktree add .worktrees/stepcard  phase16/step-card-refresh
git -C $root worktree add .worktrees/shell     phase16/builder-shell
git -C $root worktree add .worktrees/library   phase16/library-refresh
```

---

### Agent A — `Schedule-Picker-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\sched`
**Branch:** `phase16/schedule-picker`
**Primary screen:** The Schedule config form inside the builder.

#### Files You OWN (exclusive write)

```
src/components/scenarios/builder/modules/ScheduleConfig.tsx   (full rewrite)
```

#### Files You May READ (do not write)

```
src/lib/cron-builder.ts          (buildCron, parseCron, humanizeCronShort, nextFireAt)
src/lib/constants.ts             (timezone list)
src/lib/integration-icons.tsx
src/server/mocks/types.ts
src/components/ui/*
```

#### Files You Must NOT Touch

Everything outside your owned list. Especially: `src/components/scenarios/builder/StepCard.tsx` (Agent B), `src/components/scenarios/builder/ScenarioBuilder.tsx` (Agent C), any file under `src/components/scenarios/builder/modules/` except `ScheduleConfig.tsx`.

---

#### Task A.1 — Frequency Dropdown

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx` (rewrite from scratch)

**What to build:**
- A `<Select>` (shadcn `Select` primitive) with options: Hourly, Daily, Weekly, Monthly, Advanced
- Default value: "Daily" for new configs; derived from `parseCron(config.cronExpression)` for existing
- On frequency change, reset only the sub-fields that are incompatible with the new frequency (e.g. switching from Weekly to Daily clears `daysOfWeek` but keeps `hour` + `minute`)

**Zapier/Make pattern:** Zapier's schedule trigger starts with "Trigger Frequency" as the top-level control. Changing it morphs the form below without a page reload. Make.com uses the same pattern. The frequency select IS the main control; everything else is subordinate.

**Code sketch:**
```tsx
// before (Phase 1.5 ScheduleConfig)
return (
  <div>
    <Input placeholder="0 7 * * *" value={config.cronExpression} onChange={...} />
    <p className="text-xs text-muted-foreground">{humanizeCronShort(...)}</p>
    <Select ... timezone ... />
  </div>
)

// after (Phase 1.6 ScheduleConfig) — top-level structure
return (
  <div className="space-y-4">
    <FrequencySelect value={frequency} onChange={setFrequency} />
    {frequency === 'hourly'   && <MinutePicker ... />}
    {frequency === 'daily'    && <><TimePicker .../> </>}
    {frequency === 'weekly'   && <><DayOfWeekPills ... /><TimePicker .../></>}
    {frequency === 'monthly'  && <><DayOfMonthInput .../><TimePicker .../></>}
    {frequency === 'advanced' && <RawCronInput ... />}
    <TimezoneSelect value={config.timezone} onChange={...} />
    <CronPreview expr={derivedCron} />
  </div>
)
```

**Acceptance criteria:**
- [ ] Frequency select is visible and functional
- [ ] Selecting a frequency changes the sub-form below without full re-render
- [ ] Switching frequency preserves compatible fields (hour, minute survive going Daily → Weekly)

---

#### Task A.2 — Time Picker (HH:MM)

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

**What to build:**
- `<input type="time">` styled to match shadcn `Input` visual appearance (same border-radius, height, padding)
- Label: "Run at (24h)" for Daily/Weekly/Monthly sub-forms
- Persists as `hour` + `minute` integers internally; converts to/from `HH:MM` string for the native time input

**Zapier/Make pattern:** Zapier shows a simple time field ("At what time?") below the frequency. No AM/PM toggle — 24h is simpler and internationally standard.

**Acceptance criteria:**
- [ ] Time input visible and functional for Daily, Weekly, Monthly frequencies
- [ ] Value round-trips correctly (save HH:MM, reopen → same HH:MM)
- [ ] Time input hidden for Hourly and Advanced

---

#### Task A.3 — Day-of-Week Toggle Pills

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

**What to build:**
- 7 pill buttons (Mon Tue Wed Thu Fri Sat Sun), multi-select
- Selected state: `bg-primary text-primary-foreground` ; unselected: `border border-border text-foreground`
- At least 1 day required; attempting to deselect the last one shows a toast "At least one day must be selected"
- Keyboard: Tab navigates across pills, Space toggles

**Zapier/Make pattern:** Make.com shows day-of-week as toggle chips. No dropdown, no multi-select combobox — the visual affordance of toggleable pills is self-explanatory and faster than a dropdown.

**ASCII mini-mockup:**
```
Run on:  [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
          ███                              (selected=Mon only)
```

**Acceptance criteria:**
- [ ] All 7 days renderable, multi-select works
- [ ] At least-one-day guard fires correctly
- [ ] Pills are keyboard-operable (Space to toggle, Tab to navigate)

---

#### Task A.4 — Day-of-Month Input

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

**What to build:**
- `<Input type="number" min={1} max={31}>` with label "On day of month"
- Validate 1–31 inline (red border + helper text if out of range)
- Note below: "If the month has fewer days, the run is skipped." (informational, muted text)

**Acceptance criteria:**
- [ ] Input accepts only 1–31, shows inline error for out-of-range
- [ ] Informational note rendered below

---

#### Task A.5 — Advanced Mode Raw Cron Input

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

**What to build:**
- When frequency is "Advanced", show the existing raw cron `<Input>` text field (preserves Phase 1.5 behaviour)
- Show `humanizeCronShort(expr)` below as a live preview
- If `parseCron(rawExpr)` returns non-null (i.e. the expression IS one of our 4 named patterns), show a small hint: "This matches the [Daily] pattern — you can switch to simplified mode" with a button to switch. Switching calls `parseCron`, sets frequency state, and discards the raw expr.

**Acceptance criteria:**
- [ ] Raw cron input appears only when Advanced is selected
- [ ] Live `humanizeCronShort` preview updates on each keystroke (debounced 200ms)
- [ ] Simplified-mode hint appears when parseCron succeeds

---

#### Task A.6 — Cron Expression Persistence and Round-Trip

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

**What to build:**
- On every sub-field change, call `buildCron({ frequency, hour, minute, daysOfWeek, dayOfMonth, customExpression })` and write the result to `config.cronExpression` via the parent's `onChange` callback
- On component mount with an existing `config.cronExpression`, call `parseCron(expr)` to seed initial state; if parse returns null, default to `frequency = 'advanced'` with the raw expr shown

**Acceptance criteria:**
- [ ] Opening a scenario with `0 7 * * *` shows frequency=Daily, time=07:00
- [ ] Opening a scenario with `0 8 * * 1` shows frequency=Weekly, Mon selected, 08:00
- [ ] Opening a scenario with `0 */4 * * *` (non-standard) shows frequency=Advanced with the raw expr in the input
- [ ] `pnpm typecheck` passes in the worktree

---

#### UI/UX Best Practices — Schedule Picker Lane

1. **The frequency select is the command center.** All sub-fields are its subordinates. The visual hierarchy must make this unmistakable: frequency select at top, sub-fields slightly indented or separated by a divider, timezone at the bottom. A flat list of fields with equal visual weight makes users hunt for the right one.

2. **Preserve compatible field values when switching frequency.** If a user enters 08:00 for a daily schedule and then switches to weekly to add day-of-week, wiping the 08:00 forces them to re-enter it. Losing data the user already entered without warning is the single most frustrating UX pattern in form design.

3. **The raw cron input in Advanced mode is a power-user escape hatch, not the primary interface.** Style it as a monospace `Input` with a faint code-like appearance so it signals "technical mode" without being harsh. Pair it with the `humanizeCronShort` preview so power users can see what they're building.

4. **Day-of-week pills must be at least 40×36px for touch targets.** Smaller pills are a mobile usability failure — users miss and accidentally deselect.

5. **The "At least one day" guard must use a toast, not an inline error.** The pill's selected state is the only persistent visual. An inline error would appear next to a non-selected pill and confuse the user about which pill caused the error.

6. **`<input type="time">` is unstyled by default on Windows/Chrome.** Apply `[&::-webkit-calendar-picker-indicator]:hidden` and rely on the browser's native time spinner, OR style it with the same `h-9 rounded-md border border-input px-3 text-sm` classes as shadcn `Input` so it matches the form grid visually.

7. **Advanced → simplified mode detection should only suggest, never force.** Automatically switching the user out of Advanced mode because `parseCron` happened to succeed would break a workflow where the user is deliberately editing a cron expression that happens to match a named pattern. Show the hint; let them click.

---

### Agent B — `Step-Card-Refresh-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\stepcard`
**Branch:** `phase16/step-card-refresh`
**Primary screen:** All step cards in the builder and their config forms (except ScheduleConfig).

#### Files You OWN (exclusive write)

```
src/components/scenarios/builder/StepCard.tsx
src/components/scenarios/builder/modules/ModuleConfigShell.tsx
src/components/scenarios/builder/modules/ManualConfig.tsx
src/components/scenarios/builder/modules/FbAccountInsightsConfig.tsx
src/components/scenarios/builder/modules/FbCampaignInsightsConfig.tsx
src/components/scenarios/builder/modules/FbAdInsightsConfig.tsx
src/components/scenarios/builder/modules/SheetsAppendConfig.tsx
src/components/scenarios/builder/modules/SheetsUpsertConfig.tsx
src/components/scenarios/builder/modules/FieldMappingPicker.tsx
```

#### Files You May READ (do not write)

```
src/lib/integration-icons.tsx
src/lib/modules.ts              (MODULES registry, shortName, description, sampleOutput)
src/lib/cron-builder.ts         (humanizeCronShort — for Schedule summary)
src/server/mocks/types.ts
src/server/mocks/data.ts
src/components/ui/*
src/components/scenarios/builder/modules/ScheduleConfig.tsx   (read-only; owned by Agent A)
```

#### Files You Must NOT Touch

`src/components/scenarios/builder/ScenarioBuilder.tsx`, `src/components/scenarios/builder/BuilderHeader.tsx`, `src/components/scenarios/builder/TestRunPanel.tsx`, any list-page components, any frozen files.

---

#### Task B.1 — Collapsed Card: Brand Icon Tile + Configured Summary

**File:** `src/components/scenarios/builder/StepCard.tsx`

**What to build:**

Collapsed card layout (left-to-right):
```
[brand tile] | [role badge] [module name] · [summary]  | [status pill] [chevron] [drag handle]
             |  [config detail line — smaller, muted]  |
```

- **Role badge:** `WHEN` (slate, position 1 only) or `THEN` (primary color, positions ≥2). Position 1 only ever shows `WHEN`.
- **Brand tile:** `getIntegrationMeta(step.moduleType)` from `src/lib/integration-icons.tsx`. Tile is `h-9 w-9 rounded-lg flex items-center justify-center` with `tileBg` class. Icon is `h-4 w-4` with `iconColor` class.
- **Configured summary** (inline after `·`): computed by `summarizeStep(step)` — see table below.
- **Config detail line:** second line of text, smaller (`text-xs text-muted-foreground`), showing the most useful secondary detail.
- **Status pill:** `✓ Ready` (green, when all required fields are filled) / `⚠ Needs config` (amber, when any required field is empty) / `◯ Empty` (slate, when no config has been entered at all). Must use both color AND glyph — never color alone.
- **Drag handle:** `display: none` for position-1 trigger steps (currently rendered at 30% opacity — fix this).
- **Whole card is the click target:** wrap in `<button type="button" onClick={onToggleExpand}>` with `role` and `tabIndex` set correctly. The chevron is purely decorative.

**`summarizeStep(step: DraftStep): string` table — implement this as a helper in StepCard.tsx:**

| `step.moduleType` | Logic |
|---|---|
| `trigger.schedule` | `humanizeCronShort(step.config.cronExpression as string)` or `"Not configured"` |
| `trigger.manual` | `"Triggered by hand"` |
| `fb.account_insights` | `"${accountName} · last ${dateWindow} days · ${metricsCount} metrics"` |
| `fb.campaign_insights` | `"${accountName} · last ${dateWindow} days · ${metricsCount} metrics${campaignFilter ? ' · Campaign filter set' : ''}"` |
| `fb.ad_insights` | Same as campaign_insights |
| `sheets.append` | `"${spreadsheetId ? 'My Tracker' : '—'} / ${tabName ?? '—'} · ${fieldCount} fields"` |
| `sheets.upsert` | `"${spreadsheetId ? 'My Tracker' : '—'} / ${tabName ?? '—'} · ${fieldCount} fields · key: ${keyFields?.join('+') ?? '—'}"` |

Fallback for any module with missing/empty config: `"Not configured"`.

**Zapier pattern:** In Zapier, the collapsed step shows the step name + a one-line summary of the configuration ("Trigger: Schedule · Every day at 7am"). This lets users scan the full flow at a glance without expanding each card.

**Before/after sketch:**
```
// before — collapsed card
<div className="flex items-center gap-2 p-4">
  <span className="text-xs font-mono">①</span>
  <Clock className="h-4 w-4" />
  <span>Schedule</span>
  <ChevronDown />
  <MoreHorizontal />
</div>

// after — collapsed card
<button type="button" onClick={onToggleExpand} className="flex w-full items-center gap-3 p-4 text-left">
  <IntegrationIconTile moduleType={step.moduleType} />
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <RoleBadge position={step.position} />
      <span className="font-medium">{MODULES[step.moduleType].name}</span>
      {summary && <><span className="text-muted-foreground">·</span><span className="truncate text-muted-foreground">{summary}</span></>}
    </div>
    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
  </div>
  <StatusPill step={step} />
  <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} aria-hidden />
  {step.position > 1 && <DragHandle />}
</button>
```

**Acceptance criteria:**
- [ ] Brand icon tile visible and colored per integration on all step cards
- [ ] Configured summary appears inline after module name for all 7 module types
- [ ] Status pill shows correct state (✓/⚠/◯) with both color and glyph
- [ ] Drag handle is completely absent (not just visually hidden) for trigger steps (position 1)
- [ ] Entire card is keyboard-operable (Tab to card, Enter/Space to expand)
- [ ] `pnpm typecheck` passes in the worktree

---

#### Task B.2 — Expanded Card: "What This Does" Description Panel

**File:** `src/components/scenarios/builder/modules/ModuleConfigShell.tsx`

**What to build:**

At the top of the expanded shell, above the tab row, render a description strip:

```
┌──────────────────────────────────────────────────┐
│ [brand tile]  Get Account Insights               │
│               Pull performance metrics for one   │
│               Facebook ad account for a date     │
│               range you define.                  │
└──────────────────────────────────────────────────┘
```

Pull the text from `MODULES[moduleType].description`. Style: `bg-muted/30 rounded-lg p-3 mb-4`. Icon tile is the same brand tile used in the collapsed header.

**Acceptance criteria:**
- [ ] Description panel appears at top of all 7 expanded module shells
- [ ] Text is sourced from `MODULES[moduleType].description` (not hardcoded)

---

#### Task B.3 — Expanded Card: Configure + Sample Tabs

**File:** `src/components/scenarios/builder/modules/ModuleConfigShell.tsx`

**What to build:**

Two tabs within the expanded card (using shadcn `Tabs` primitive — confirm it exists in `src/components/ui/`, else use a simple controlled state with two styled buttons):

- `Configure` tab (default): the existing config form JSX
- `Sample` tab: a read-only mini-table

**Sample tab content:**
```tsx
// Render MODULES[moduleType].sampleOutput as a table
// sampleOutput is an array of 3 objects — render as 3 rows × ≤5 columns
// Columns derived from Object.keys(sampleOutput[0]).slice(0, 5)
// All cells read-only, monospace font, truncated at 20 chars
// Below the table: "This is a preview of what this step would output. Real data
//   will vary based on your configuration."
```

For trigger modules (`trigger.schedule`, `trigger.manual`) that have no meaningful sample output, show: `"This trigger has no sample output. Add a downstream step to see its output."` — as centered muted text in the Sample tab body.

**Acceptance criteria:**
- [ ] Tabs switch between Configure and Sample correctly
- [ ] Sample table renders for all 5 action modules (FB × 3, Sheets × 2)
- [ ] Trigger modules show the fallback message in Sample tab
- [ ] Tabs are keyboard navigable (Arrow Left / Arrow Right between tabs)

---

#### Task B.4 — Inline Help Text for All Config Forms

**File:** All 7 `*Config.tsx` files in `src/components/scenarios/builder/modules/`

**What to build:**

Below every required field label, add a single line of plain help text (Zapier-style — not a tooltip, always visible). Add it as `<p className="text-xs text-muted-foreground mb-2">{helpText}</p>` immediately after the `<label>` and before the `<Input>` or `<Select>`.

**Help text table (embed this verbatim in the code as string constants):**

| Field | Module | Help text |
|---|---|---|
| Cron expression | ScheduleConfig | See Agent A's config |
| Account | Fb* | "Which Facebook ad account to pull data from. Only accounts you've connected appear here." |
| Date window | Fb* | "How many days back from today this pull should cover. Larger windows give more history but make pulls slower." |
| Metrics | Fb* | "The performance metrics to include in each row. Select all you'll need — you can filter in Sheets later." |
| Campaign filter | FbCampaign/FbAd | "Optional. Enter a campaign name fragment to narrow results. Leave blank to pull all campaigns." |
| Spreadsheet ID | Sheets* | "The ID from your Google Sheet's URL: docs.google.com/spreadsheets/d/[THIS-PART]/edit" |
| Tab name | Sheets* | "The exact name of the sheet tab to write to (case-sensitive). It must already exist." |
| Key fields | SheetsUpsert | "Fields that uniquely identify a row. If a row with the same key values already exists, it will be updated rather than added." |
| Field mapping | Sheets* | "Choose which fields from the previous step to write as columns. The column header in Sheets will match the field name." |

**Acceptance criteria:**
- [ ] Help text appears below every required field label in all 7 config forms
- [ ] Help text uses `text-xs text-muted-foreground` — clearly subordinate to the label
- [ ] Help text does not disappear on field focus (unlike a placeholder)

---

#### Task B.5 — Enriched Validation Error Copy

**File:** All 7 `*Config.tsx` files

**What to build:**

Validation errors must include the *why*, not just "required". Replace generic messages:

| Old | New |
|---|---|
| "Required" | "Date window must be at least 1 day — Facebook returns no rows for a zero-day pull." |
| "Required" (account) | "Select an ad account to continue — this determines which data is pulled." |
| "Required" (metrics) | "Select at least one metric — an empty pull has no columns to write to Sheets." |
| "Required" (spreadsheetId) | "A spreadsheet ID is required — without it there is nowhere to write the data." |
| "Required" (tabName) | "A tab name is required — the tab must already exist in your spreadsheet." |
| "Required" (fieldMapping) | "Select at least one field — otherwise the row would be written with no columns." |

**Acceptance criteria:**
- [ ] All validation errors use the enriched copy from the table above (or equivalent quality)
- [ ] Errors appear below the relevant field, not as a toast or global banner

---

#### Task B.6 — `ManualConfig.tsx` Polish

**File:** `src/components/scenarios/builder/modules/ManualConfig.tsx`

**What to build:**

The Manual trigger has no config fields. The current implementation likely shows a blank or minimal component. Phase 1.6 target:

```
┌──────────────────────────────────────────────────┐
│  [⚡ indigo tile]  Manual Trigger                │
│  ─────────────────────────────────────────────── │
│  This scenario runs when you click               │
│  "Run now" in the header or from the             │
│  scenarios list. No schedule is needed.          │
│                                                  │
│  Status: ✓ Ready (no configuration required)     │
└──────────────────────────────────────────────────┘
```

The "Status: ✓ Ready" line is muted green text, not a pill. The icon tile in this component should use `getIntegrationMeta('trigger.manual')`.

**Acceptance criteria:**
- [ ] ManualConfig renders the informational copy and "Ready" status
- [ ] `summarizeStep` for `trigger.manual` returns `"Triggered by hand"`

---

#### UI/UX Best Practices — Step Card Refresh Lane

1. **Configured-summary line must use the same font-size and weight as the module name.** They sit on the same line separated by `·`. If the summary is smaller or lighter, the eye breaks the line into two separate visual objects and the summary reads like a caption, not a peer. Use `text-sm font-medium` for both, `text-muted-foreground` for the summary only.

2. **Status pills must include both color AND a glyph (✓ / ⚠ / ◯).** Color-only status fails accessibility audits (WCAG 1.4.1: Use of Color). The glyph makes the status scannable for users with color vision deficiency and for users who print the page.

3. **The whole card being the click target means the chevron is purely decorative.** Add `aria-hidden="true"` to the chevron, remove it from Tab order, and ensure the `<button>` wrapper has `aria-expanded={isExpanded}` and `aria-controls` pointing at the expanded region's id. Screen readers should announce "Schedule button, expanded" / "...collapsed."

4. **Drag handle must be `display: none`, not `opacity-0` or `pointer-events-none`, for trigger steps.** An invisible-but-accessible drag handle will still be reachable by screen readers and keyboard Tab, creating confusion. `display: none` removes it from all accessibility trees.

5. **Inline help text must never use `title` attribute or `Tooltip` components.** Tooltips fail touch devices (no hover state) and require an extra interaction (hover/focus) to read. Always-visible plain text is the Zapier pattern and the accessible choice.

6. **Sample tab mini-table should limit to 5 columns.** FB modules can output 20+ columns. A mini-table with 20 columns overflows the card. Slice to 5 and add a note: "+ 15 more fields available in full output." This teaches the user the schema without overwhelming.

7. **`summarizeStep` must gracefully return "Not configured" for any falsy field**, not crash or return `undefined`. The collapsed card renders at all times — a runtime error here breaks the entire builder.

8. **RoleBadge (`WHEN` / `THEN`) must be muted-styled.** It is metadata, not a label the user set. A bright badge competes with the module name. Use `bg-muted text-muted-foreground text-[10px] font-mono uppercase px-1.5 py-0.5 rounded`.

---

### Agent C — `Builder-Shell-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\shell`
**Branch:** `phase16/builder-shell`
**Primary screens:** `/scenarios/new`, `/scenarios/[id]` — the outer shell wrapping the step cards.

#### Files You OWN (exclusive write)

```
src/components/scenarios/builder/ScenarioBuilder.tsx
src/app/(dashboard)/scenarios/[id]/ScenarioDetailClient.tsx
src/components/scenarios/builder/BuilderHeader.tsx
src/components/scenarios/builder/TestRunPanel.tsx
```

#### Files You May READ (do not write)

```
src/lib/integration-icons.tsx
src/lib/modules.ts
src/lib/cron-builder.ts          (humanizeCronShort, nextFireAt)
src/server/mocks/types.ts
src/server/api/root.ts
src/components/scenarios/builder/StepCard.tsx   (read-only — owned by Agent B)
src/components/ui/*
```

#### Files You Must NOT Touch

`src/components/scenarios/builder/modules/*`, `src/components/scenarios/builder/ModuleLibraryModal.tsx`, `src/components/scenarios/builder/TemplatePicker.tsx`, any list-page components, any frozen files.

---

#### Task C.1 — Builder Header: Breadcrumb + Auto-Summary

**File:** `src/components/scenarios/builder/BuilderHeader.tsx`

**What to build:**

```
← Scenarios / Multi-account daily roundup
   Daily at 07:00 → Get Account Insights → Append Rows
```

- Breadcrumb row: `← Scenarios` link + `/` separator + scenario name (inline-editable, preserved from Phase 1.5)
- Auto-summary subtitle: `summarizeSteps(steps)` — see implementation hint below
- Subtitle typography: `text-sm text-muted-foreground`, truncated with `truncate` on narrow viewports

**`summarizeSteps` implementation (embed this in BuilderHeader.tsx or a sibling helper):**

```typescript
import { humanizeCronShort } from '@/lib/cron-builder'
import { MODULES } from '@/lib/modules'
import type { DraftStep } from '@/server/mocks/types'

function summarizeSteps(steps: DraftStep[]): string {
  if (steps.length === 0) return ''
  const parts = steps.map((s) => {
    if (s.moduleType === 'trigger.schedule') {
      const cron = String(s.config.cronExpression ?? '')
      return cron ? humanizeCronShort(cron) : 'Schedule'
    }
    if (s.moduleType === 'trigger.manual') return 'Manual'
    return MODULES[s.moduleType]?.shortName ?? s.moduleType
  })
  return parts.join(' → ')
}
```

**Acceptance criteria:**
- [ ] Breadcrumb "Scenarios / [name]" visible and both parts are links/text
- [ ] Auto-summary subtitle updates reactively when steps change
- [ ] Subtitle truncates gracefully at 375px

---

#### Task C.2 — Builder Header: Status Strip + Run-Now Button

**File:** `src/components/scenarios/builder/BuilderHeader.tsx`

**What to build:**

Below the breadcrumb + subtitle:
```
● Enabled · Next run in 2h 14m              [Test] [Run now] [Save]
30 runs · 26 succeeded · 4 failed
```

- **Enabled indicator:** colored dot (`bg-green-500` when enabled, `bg-muted-foreground` when disabled) + text. The existing enabled toggle from Phase 1.5 moves here or is replaced by this indicator + a toggle switch elsewhere (keep whatever is less disruptive — but the dot+text must be present).
- **Next-run countdown:** appears only when `enabled === true` AND the scenario has a `trigger.schedule` step with a valid cronExpression. Computed as `nextFireAt(cronExpr, timezone, new Date())`. Format: "Next run in Xh Ym" using a simple formatter (no external library).
- **Run-history glance:** query `scenariosRouter.list` or use the data already loaded in `ScenarioDetailClient`. Show "N runs · M succeeded · P failed". If no runs: omit this line entirely.
- **[Run now] button:** secondary style, next to [Test]. On click: calls `scenariosRouter.runNow(id)`, shows a spinner on the button for 600ms, on resolve navigates to `/runs/[returnedRun.id]`. On error: shows a toast "Run failed to start" and restores button.
- **[Save] button:** primary blue (`bg-primary`), only visually active (not just `disabled` attribute) when the form is dirty. When clean, button is muted/disabled with tooltip "No unsaved changes."

**Zapier pattern:** Zapier's builder header shows scenario status, next scheduled time, and run counts in a compact strip. The cognitive load is minimal — users see health at a glance without opening a separate tab.

**Acceptance criteria:**
- [ ] Next-run indicator appears and computes correctly for schedule triggers
- [ ] Next-run indicator absent for manual triggers or disabled scenarios
- [ ] Run-now button calls `runNow` and navigates to the resulting run
- [ ] Run-history glance line visible when runs exist, absent when no runs

---

#### Task C.3 — First Step Expanded by Default

**File:** `src/components/scenarios/builder/ScenarioBuilder.tsx`

**What to build:**

When any scenario page loads (both `/scenarios/new` and `/scenarios/[id]`), the first step card is expanded by default. All subsequent step cards are collapsed.

```typescript
// In the ScenarioBuilder component, initialise expanded state:
const [expandedStepId, setExpandedStepId] = useState<string | null>(
  steps.length > 0 ? (steps[0]?.id ?? null) : null
)
```

This ensures the page never looks inert on arrival — the user immediately sees a config form, not a list of collapsed cards.

**Acceptance criteria:**
- [ ] First step is expanded on initial render for both new and existing scenarios
- [ ] Subsequent steps are collapsed on initial render
- [ ] Clicking a collapsed card expands it (and optionally collapses the previous one — single-expand model is acceptable)

---

#### Task C.4 — Empty State: Trigger Picker Cards

**File:** `src/components/scenarios/builder/ScenarioBuilder.tsx`

**What to build:**

When `steps.length === 1 && step[0]` is an empty trigger (no `moduleType` set), show the trigger picker UI instead of the standard builder + Add step:

```
┌─────────────────────────────────────────────────┐
│  Step 1: When this happens...                   │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ [🕒] slate   │  │ [⚡] indigo  │             │
│  │  Schedule    │  │  Manual      │             │
│  │  Run on a    │  │  Trigger by  │             │
│  │  recurring   │  │  hand when   │             │
│  │  schedule    │  │  you click   │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  Pick a trigger to start your scenario.         │
└─────────────────────────────────────────────────┘
```

Clicking a trigger card:
1. Sets `step[0].moduleType` to `trigger.schedule` or `trigger.manual`
2. Expands the step card (now showing the selected trigger's config form)
3. Shows the `+ Add step` button below the now-configured trigger

After the trigger is set and at least one action is added, the picker cards disappear permanently (replaced by the standard builder UI).

**For "Step 2: Then do this..." (action picker):** When exactly one trigger step exists and no action steps exist, show a similar picker for actions:
```
┌─────────────────────────────────────────────────┐
│  Step 2: Then do this...                        │
│                                                  │
│  [📘 fb-blue] Facebook Ads                       │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Get Account  │  │ Get Campaign │  ...        │
│  │ Insights     │  │ Insights     │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  [📊 sheets-green] Google Sheets                 │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Append Rows  │  │ Upsert Rows  │             │
│  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
```

Once at least one action exists, this picker disappears and the standard `+ Add step` button takes over.

**Acceptance criteria:**
- [ ] Trigger picker appears on fresh scratch scenario (no moduleType on step 0)
- [ ] Selecting a trigger sets the moduleType and expands the config form
- [ ] Action picker appears after trigger is set but no actions exist
- [ ] Both pickers disappear once the scenario has trigger + at least one action
- [ ] Action picker uses brand icon tiles per integration

---

#### Task C.5 — Test Panel: Sliding Bottom Dock

**File:** `src/components/scenarios/builder/TestRunPanel.tsx`

**What to build:**

Replace the Phase 1.5 inline `<details>` with a sliding bottom dock:

- Fixed position: `fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30`
- Height: `h-[280px]` when open
- Animation: `transform translateY(100%) → translateY(0)` on open via CSS transition `transition-transform duration-200`. With `prefers-reduced-motion`: `transition: opacity 150ms` only (no slide).
- Header row: `"Test results · N of M steps succeeded · Xms total"` + Close `[×]` button on the right
- Body: scrollable list of per-step rows
- Each step row: `[brand tile] [module name] [duration badge] [✓/✗ icon]`
- Click a step row: toggles open an inline detail panel (3-row × ≤5-col mini-table of the step's test output) below that row
- Close button OR Esc key dismisses the dock (returns to `translateY(100%)`)
- `aria-live="polite"` on the results container so screen readers announce updates

**Phase 1.5 before:**
```tsx
// Inline <details> below step list
<details>
  <summary>Test results</summary>
  <pre>{JSON.stringify(results, null, 2)}</pre>
</details>
```

**Phase 1.6 after:**
```tsx
// Fixed bottom dock
<div
  role="region"
  aria-label="Test results"
  className={cn(
    'fixed bottom-0 left-[var(--sidebar-width,16rem)] right-0 z-30',
    'flex flex-col bg-background border-t shadow-lg',
    'h-[280px] transition-transform duration-200',
    isOpen ? 'translate-y-0' : 'translate-y-full'
  )}
>
  <DockHeader results={results} onClose={onClose} />
  <DockBody results={results} />
</div>
```

**Acceptance criteria:**
- [ ] Dock slides up when Test button is clicked
- [ ] Dock slides down when Close or Esc is pressed
- [ ] `prefers-reduced-motion` uses fade instead of slide
- [ ] Per-step rows show brand tile + name + duration + ✓/✗
- [ ] Clicking a step row shows the mini-table detail inline
- [ ] Dock does not cover the builder content — ensure builder canvas has `pb-72` when dock is open
- [ ] `pnpm typecheck` passes in worktree

---

#### UI/UX Best Practices — Builder Shell Lane

1. **The auto-summary subtitle is ephemeral feedback, not a primary label.** Use `text-muted-foreground` and a slightly smaller size than the scenario name. It should feel like a caption under a photo — supplemental, not competing. If the step list is empty, the subtitle should be empty or absent (not "→").

2. **The next-run countdown must update every minute.** Use `setInterval(update, 60_000)` in a `useEffect` with a cleanup. A countdown that shows "Next run in 2h 14m" and never changes is worse than no countdown — it erodes trust.

3. **The sliding dock must not block the Save/Test buttons.** When the dock is open, the builder canvas needs bottom padding equal to the dock height (`pb-[280px]`). Without this, the last step card and action buttons are hidden under the dock.

4. **Run-now and Test are secondary actions; Save is primary.** The visual hierarchy must reflect this: `[Test] [Run now]` as secondary outline buttons, `[Save]` as primary filled button. Reversing the hierarchy (all three same style) makes the page feel like it has no obvious next action.

5. **The trigger picker cards must be the same size as the template picker cards in TemplatePicker.tsx.** Visual consistency across the "pick a starting point" pattern matters — the user encounters it in both `/scenarios/new` and the empty builder on scratch scenarios. Different card sizes for functionally identical choices is a design inconsistency.

6. **First step expanded by default is a deliberate attention anchor.** On a fresh page load, an all-collapsed builder looks like an empty page. The single expanded first step communicates "here is where you start" without a tooltip or onboarding overlay. Do not add a tooltip — the expanded card IS the orientation cue.

7. **The status strip ("30 runs · 26 succeeded · 4 failed") must be derived from mock data, not hardcoded.** Filter `MOCK_RUNS` by `scenarioId` to compute these numbers. Hardcoded numbers that don't match the run history tab break user trust immediately.

---

### Agent D — `Library-Refresh-Agent`

**Worktree:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation\.worktrees\library`
**Branch:** `phase16/library-refresh`
**Primary screens:** Module library modal and template picker.

#### Files You OWN (exclusive write)

```
src/components/scenarios/builder/ModuleLibraryModal.tsx
src/components/scenarios/builder/ModuleLibraryCard.tsx
src/components/scenarios/builder/TemplatePicker.tsx
```

#### Files You May READ (do not write)

```
src/lib/integration-icons.tsx
src/lib/modules.ts
src/lib/scenario-templates.ts
src/server/mocks/types.ts
src/components/ui/*
```

#### Files You Must NOT Touch

All step-card components (Agent B), all shell components (Agent C), all config forms (Agent A + B), any frozen files.

---

#### Task D.1 — Module Library Modal: Branded Section Headers

**File:** `src/components/scenarios/builder/ModuleLibraryModal.tsx`

**What to build:**

Replace the plain grouped list headers with branded section headers:

```
┌── [🕒] Triggers ──────────────────────────────────────┐
│   (left-colored bar matching schedule-slate)           │
│   [module cards grid]                                  │
│                                                        │
├── [📘] Facebook Ads ───────────────────────────────────┤
│   (left-colored bar matching fb-blue)                  │
│   [module cards grid]                                  │
│                                                        │
├── [📊] Google Sheets ──────────────────────────────────┤
│   (left-colored bar matching sheets-green)             │
│   [module cards grid]                                  │
└────────────────────────────────────────────────────────┘
```

Section header component:
```tsx
<div className="flex items-center gap-2 px-2 py-1.5">
  <div className={cn('flex h-6 w-6 items-center justify-center rounded', tileBg)}>
    <Icon className={cn('h-3.5 w-3.5', iconColor)} />
  </div>
  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {sectionLabel}
  </span>
</div>
```

When search is active and a section has 0 matching modules, hide the entire section (header + cards).

**Zapier/Make pattern:** Zapier's app picker groups apps under branded section headers with the app's icon. This instantly orients the user to which company's tools they're looking at.

**Acceptance criteria:**
- [ ] Branded section headers visible for Triggers, Facebook Ads, Google Sheets
- [ ] Section color matches integration brand color
- [ ] Section disappears entirely when search filters out all its modules

---

#### Task D.2 — Module Cards: Brand Tile + Click-Anywhere

**File:** `src/components/scenarios/builder/ModuleLibraryCard.tsx`

**What to build:**

Full card rewrite. Each card is a `<button>` (not a div with an onClick — use a semantic button for keyboard accessibility):

```
┌─────────────────────────────┐
│ [brand tile]  Get Account   │
│               Insights      │
│               Pull metrics  │
│               for an ad     │
│               account.      │
└─────────────────────────────┘
```

- Tile: `h-9 w-9 rounded-lg` with integration colors from `getIntegrationMeta`
- Module name: `text-sm font-medium`
- Description: `text-xs text-muted-foreground line-clamp-3`
- Hover state: `border-primary/40 shadow-sm` transition
- Active/focus state: `ring-2 ring-primary ring-offset-2`
- Cards laid out in a 2-column responsive grid (`grid grid-cols-2 gap-2`)

**Acceptance criteria:**
- [ ] Click anywhere on card selects the module
- [ ] Hover state uses `border-primary/40 shadow-sm`
- [ ] Cards keyboard-selectable (Tab to card, Enter to select)
- [ ] Brand tile color correct per integration

---

#### Task D.3 — Module Library Modal: Search Auto-Focus + Keyboard Nav

**File:** `src/components/scenarios/builder/ModuleLibraryModal.tsx`

**What to build:**

- Search input auto-focused on modal open (`autoFocus` attribute or `useEffect` with `ref.current?.focus()`)
- Esc closes the modal without selecting (already Phase 1.5 — confirm it still works)
- Enter selects the first visible card (i.e. first card in the first visible section after filtering)
- Arrow Down from search input moves focus to the first card
- Arrow keys navigate between cards (Left/Right within a row, Down/Up between rows)

**Acceptance criteria:**
- [ ] Search auto-focused on open
- [ ] Esc closes modal
- [ ] Enter selects first visible card
- [ ] Arrow keys navigate cards

---

#### Task D.4 — TemplatePicker: Brand Tiles + 4th Scratch Card

**File:** `src/components/scenarios/builder/TemplatePicker.tsx`

**What to build:**

1. **Brand tile per template card:** Derive the brand from the template's **terminal action step** (last step's `moduleType`). Daily campaign metrics → `sheets.upsert` → sheets-green tile. Hourly ad performance → `sheets.upsert` → sheets-green tile. One-shot manual → `sheets.append` → sheets-green tile.

2. **4th card: "Build from scratch"** — equal in size and visual weight to template cards:

```
┌──────────────────────┐
│  ┌──┐                │
│  │ + │  Build from   │
│  └──┘  scratch       │
│  ─────────────────── │
│  Start with an       │
│  empty scenario and  │
│  add steps yourself. │
└──────────────────────┘
```

- Border: `border-2 border-dashed border-border`
- Icon tile: `bg-muted` with a `+` (`Plus` lucide icon) in `text-muted-foreground`
- On click: `router.push('/scenarios/new?template=scratch')` (this routes to the empty builder — the Stage 0'.2 bug fix ensures this now works)

3. **Card grid:** 4 cards in a 2-column grid (`grid grid-cols-2 gap-4`) — template cards fill first 3 slots, scratch card fills slot 4.

**Phase 1.5 before:**
```tsx
// 3 template cards stacked + a small italic text link below
<div className="grid grid-cols-1 gap-4">
  {templates.map(t => <TemplateCard key={t.id} template={t} />)}
</div>
<p className="text-sm italic text-muted-foreground">
  <button onClick={() => router.push('/scenarios/new')}>Build from scratch →</button>
</p>
```

**Phase 1.6 after:**
```tsx
// 4-card 2-column grid
<div className="grid grid-cols-2 gap-4">
  {templates.map(t => <TemplateCard key={t.id} template={t} />)}
  <ScratchCard />
</div>
```

**Acceptance criteria:**
- [ ] 4th card "Build from scratch" visible with dashed border, `+` icon, muted tile
- [ ] "Build from scratch" routes to `/scenarios/new?template=scratch`
- [ ] All 4 cards equal in visual weight (same grid cell, same min-height)
- [ ] Brand tile on template cards uses the terminal step's integration color
- [ ] Hover state consistent with `border-primary/40 shadow-sm`

---

#### UI/UX Best Practices — Library Refresh Lane

1. **The 4th "Build from scratch" card must be equal in weight to template cards, not subordinate.** Phase 1.5's italic text link communicated "this is a fallback for experts." Phase 1.6's goal is to normalize the scratch path as equally valid. Equal visual weight = equal invitation.

2. **Section headers with the integration icon teach users the product's vocabulary.** First-time users may not know which modules belong to Facebook vs. Google Sheets. The branded section header lets them navigate by company logo, which is faster than reading module names.

3. **Search must hide empty sections.** A "Google Sheets" section header with no cards below it is confusing — users wonder if the search is broken or if Sheets has no modules. Hide the section header with its cards together when the section count reaches zero.

4. **Click-anywhere on module cards is not a UX luxury — it is a usability requirement.** If only a small text label or a "Select" button is clickable, users who click the icon tile or the description text get no response and assume the card is inactive. A `<button>` wrapper makes the entire card surface interactive.

5. **Arrow-key navigation in the modal is the keyboard-user's equivalent of mouse scanning.** Without it, a keyboard user must Tab through every card to reach the one they want. With it, they can navigate the grid like a spreadsheet. The search field should be Tab-reachable from card focus (Tab from last card should loop back to search or reach Close).

6. **Template card brand tile should reflect the OUTPUT action, not the trigger.** The user's frame of reference is "I want to write to Sheets" — not "I want to start with a schedule trigger." Deriving the tile color from the last (output) step matches the user's mental model.

7. **Dashed border on the scratch card is a deliberate signal.** In design systems, dashed borders communicate "this is a container waiting to be filled" (think drag-and-drop targets, new-item placeholders). Using it on the scratch card visually communicates "start empty" without a label.

---

## Stage 2' — Merge, QA, and Screenshots (Orchestrator, After All 4 Subagents Finish)

> Run only after all 4 subagents have committed to their branches.

### 2'.1 — Merge Order

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root checkout phase-1.6

# File ownership is disjoint — merge in dependency order
git -C $root merge --no-ff phase16/schedule-picker    -m "merge: Agent A — schedule picker rewrite"
git -C $root merge --no-ff phase16/step-card-refresh  -m "merge: Agent B — step card refresh"
git -C $root merge --no-ff phase16/builder-shell      -m "merge: Agent C — builder shell upgrade"
git -C $root merge --no-ff phase16/library-refresh    -m "merge: Agent D — library and template refresh"
```

If any merge conflict occurs, a subagent wrote outside its assigned files. Identify the file, revert in the agent's branch, re-merge.

### 2'.2 — Typecheck and Lint

```powershell
pnpm typecheck
pnpm lint
```

Fix all errors. No `// @ts-ignore` suppressions without a reason comment.

### 2'.3 — Smoke-Test All 11 Routes

Manually navigate each route and confirm nothing is broken:

```
/                            → redirects to /connections
/login                       → login page renders
/connections                 → connections list renders
/ad-accounts                 → list renders, Quick Setup badge visible
/ad-accounts/new             → form renders
/ad-accounts/[any-id]        → form renders with data
/runs                        → runs table with Scenario column
/runs/[any-run-id]           → detail page with Scenario cell
/settings                    → settings renders
/scenarios                   → scenarios list renders
/scenarios/new               → 4-card template grid + scratch card renders
/scenarios/scn_custom_01     → builder with refreshed header + collapsed cards
```

### 2'.4 — Accessibility Check (axe)

```powershell
pnpm dlx @axe-core/cli http://localhost:3000/scenarios
pnpm dlx @axe-core/cli http://localhost:3000/scenarios/new
pnpm dlx @axe-core/cli "http://localhost:3000/scenarios/scn_custom_01"
```

Zero critical or serious violations. Fix before proceeding.

### 2'.5 — Lighthouse

Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90 on all 3 scenario routes, in both light and dark mode.

### 2'.6 — Before/After Screenshots

```powershell
New-Item -ItemType Directory -Force -Path docs/screenshots/phase16/before-after
```

Capture at 1440×900 in both light and dark mode for:
- `/scenarios`
- `/scenarios/new`
- `/scenarios/scn_custom_01`

Naming convention:
- `docs/screenshots/phase16/before-after/scenarios-before-light.png`
- `docs/screenshots/phase16/before-after/scenarios-before-dark.png`
- `docs/screenshots/phase16/before-after/scenarios-after-light.png`
- `docs/screenshots/phase16/before-after/scenarios-after-dark.png`
- (repeat for `scenarios-new-` and `scenario-builder-` prefixes)

For "before" set: use screenshots from `docs/screenshots/phase15/` if present; otherwise annotate that the before state is preserved at git tag `phase-1.5-done`.

Each subagent should also have saved `.agent-output/<agent-name>-light.png` and `.agent-output/<agent-name>-dark.png` at 1440×900 to their worktrees. Collect these during Stage 2'.

```powershell
git -C $root add docs/screenshots/phase16/
git -C $root commit -m "docs: Phase 1.6 before/after screenshots"
```

### 2'.7 — Remove Worktrees

```powershell
$root = "C:\Users\saman\OneDrive\Documents\data-365-projects\automation"
git -C $root worktree remove .worktrees/sched
git -C $root worktree remove .worktrees/stepcard
git -C $root worktree remove .worktrees/shell
git -C $root worktree remove .worktrees/library
```

### 2'.8 — Merge to Main and Tag

```powershell
git -C $root checkout main
git -C $root merge --no-ff phase-1.6 -m "Phase 1.6: Zapier-quality builder UI upgrade"
git -C $root tag phase-1.6-done
```

---

## Phase 1.6 Acceptance Checklist

### Visual Targets Met

- [ ] Step cards in collapsed state show brand-colored icon tile + configured summary + status pill
- [ ] Whole card is click-to-expand (not just chevron)
- [ ] Trigger step (position 1) has no drag handle visible (display:none, not opacity-0)
- [ ] Builder header shows breadcrumb + auto-summary subtitle + status strip + Run-now button + next-run countdown
- [ ] Test results render in a sliding bottom dock with per-step mini-table
- [ ] Empty scratch scenario shows trigger picker cards (Schedule / Manual), not a bare Add step
- [ ] After trigger set, action picker shows (FB and Sheets module cards) until first action added
- [ ] Module library modal has branded section headers + brand-colored module cards in a 2-col grid
- [ ] TemplatePicker has a 4th card "Build from scratch" equal in weight to template cards, dashed border
- [ ] Schedule picker has frequency dropdown (Hourly/Daily/Weekly/Monthly/Advanced) + time + day selectors
- [ ] Advanced mode preserves raw cron textbox and shows live humanizeCronShort preview
- [ ] First step is expanded by default on any scenario page open

### Functional Adds

- [ ] Run-now button calls `scenariosRouter.runNow` and navigates to `/runs/[runId]`
- [ ] Next-run indicator computes from `nextFireAt(cronExpression, timezone)` and updates every 60s
- [ ] All 7 module configs have inline help text below required field labels (always visible, not tooltip)
- [ ] All 7 module configs have a `Sample` tab in expanded state showing `sampleOutput` as a mini-table

### Bugs Fixed

- [ ] "Build from scratch" in TemplatePicker navigates to `/scenarios/new?template=scratch` (no more loop)
- [ ] No 1.5s white flash on `/scenarios/[id]` — skeleton fires from t=0

### Quality Gates

- [ ] `pnpm typecheck` clean (0 errors)
- [ ] `pnpm lint` clean (0 errors)
- [ ] axe: zero critical/serious violations on `/scenarios`, `/scenarios/new`, `/scenarios/scn_custom_01`
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90 on all 3 routes, light + dark
- [ ] Before/after screenshots committed to `docs/screenshots/phase16/before-after/`
- [ ] git tag `phase-1.6-done` at HEAD on `main`

---

## Explicit "Do NOT" List

- **Do NOT call real Facebook, Google, or any external API.** All data from `src/server/mocks/`.
- **Do NOT write Prisma migrations or schema changes.**
- **Do NOT add NextAuth providers.** Session is still from `getMockSession()`.
- **Do NOT add Redux, Zustand, Jotai, Recoil, or any global state library.**
- **Do NOT add new npm dependencies** (no DnD lib, no cron-parser lib, no animation libs) **without asking the orchestrator first.**
- **Do NOT use `// @ts-ignore`** without a one-line reason comment directly above the line.
- **Do NOT use `any` type** in TypeScript.
- **Do NOT ship `console.log` statements.**
- **Do NOT edit deeply frozen files** — full list at top of this document.
- **Do NOT introduce a canvas / node-graph builder UI.** Zapier-linear stays.
- **Do NOT break Phase 1.5 routes.** `/scenarios`, `/runs`, `/ad-accounts`, `/connections`, `/settings` must keep working after every merge.

---

## Each Subagent's Final Report Must Include

Before the orchestrator merges a branch, confirm the subagent's report includes:

1. **Files written** — explicit list of paths modified or created
2. **Screens / tasks completed** — reference Task IDs (A.1, B.3, etc.)
3. **Items skipped and why** — be specific; "not in scope" is not acceptable without citing the exact constraint
4. **`pnpm typecheck` status** — must pass (exit 0) in the worktree before reporting done
5. **Visual confirmation** — a 1440×900 screenshot of the agent's primary screen in light mode and dark mode, saved to `.agent-output/<agent-name>-light.png` and `.agent-output/<agent-name>-dark.png` in the worktree root. List these paths in the report.
6. **Mobile confirmation** — text confirmation (no screenshot required at Stage 1') that the primary screen renders without broken layout at 375px viewport width
