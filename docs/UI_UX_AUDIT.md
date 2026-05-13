# UI/UX Audit — Automation Dashboard
**Date:** 2026-05-12  
**App:** http://localhost:3000  
**Stack:** Next.js 15, React 19, Tailwind CSS, shadcn/ui, Geist Sans

---

## 1. Design System & Tokens

### 1.1 Color Palette (OKLch)

#### Light Mode
| Token | Value | Computed |
|---|---|---|
| `--background` | `oklch(1 0 0)` | #ffffff |
| `--foreground` | `oklch(0.145 0 0)` | ~#1a1a1a |
| `--card` | `oklch(1 0 0)` | #ffffff |
| `--card-foreground` | `oklch(0.145 0 0)` | ~#1a1a1a |
| `--primary` | `oklch(0.205 0 0)` | ~#2e2e2e |
| `--muted` | `oklch(0.97 0 0)` | ~#f7f7f7 |
| `--muted-foreground` | `oklch(0.556 0 0)` | ~#767676 |
| `--border` | `oklch(0.922 0 0)` | ~#e8e8e8 |
| `--sidebar` | `oklch(0.985 0 0)` | ~#fbfbfb |
| `--sidebar-border` | `oklch(0.922 0 0)` | ~#e8e8e8 |
| `--sidebar-accent` | `oklch(0.97 0 0)` | ~#f7f7f7 |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | ~#2e2e2e |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | ~#1a1a1a |
| `--destructive` | `oklch(0.577 0.245 27.325)` | ~#dc2626 |
| `--ring` | `oklch(0.708 0 0)` | ~#b5b5b5 |

#### Dark Mode
| Token | Value | Computed |
|---|---|---|
| `--background` | `oklch(0.145 0 0)` | ~#1a1a1a |
| `--foreground` | `oklch(0.985 0 0)` | ~#fbfbfb |
| `--card` | `oklch(0.205 0 0)` | ~#2e2e2e |
| `--muted` | `oklch(0.269 0 0)` | ~#3d3d3d |
| `--muted-foreground` | `oklch(0.708 0 0)` | ~#b5b5b5 |
| `--border` | `oklch(1 0 0 / 10%)` | rgba(255,255,255,0.1) |
| `--sidebar` | `oklch(0.205 0 0)` | ~#2e2e2e |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | ~#6366f1 purple/indigo |
| `--sidebar-accent` | `oklch(0.269 0 0)` | ~#3d3d3d |
| `--primary` | `oklch(0.922 0 0)` | ~#e8e8e8 |

#### Status Colors (hardcoded, theme-independent)
| Status | Hex | Usage |
|---|---|---|
| Queued | `#64748b` | `bg-slate-500` |
| Running | `#3b82f6` | `bg-blue-500` |
| Success | `#22c55e` | `bg-green-500` |
| Failed | `#ef4444` | `bg-red-500` |
| Warning | `#f59e0b` | `bg-amber-500` |

#### Brand Colors (hardcoded)
| Brand | Hex |
|---|---|
| Facebook blue | `#1877f2` |
| Google blue | `#4285F4` |
| Google green | `#0f9d58` |
| Bitrix24 cyan | `#2FC6F6` |
| Manual (indigo) | `#6366f1` |
| Watch (violet) | `#8b5cf6` |

---

### 1.2 Border Radius Scale
Base radius CSS variable: `--radius: 0.625rem` (10px)

| Class | Formula | Computed |
|---|---|---|
| `rounded-sm` | `calc(var(--radius) - 4px)` | 6px |
| `rounded-md` | `calc(var(--radius) - 2px)` | 8px |
| `rounded-lg` | `var(--radius)` | 10px |
| `rounded-xl` | `calc(var(--radius) + 4px)` | 14px |
| `rounded-2xl` | `calc(var(--radius) + 8px)` | 18px |
| `rounded-3xl` | `calc(var(--radius) + 12px)` | 22px |
| `rounded-4xl` | `calc(var(--radius) + 16px)` | 26px |
| `rounded-full` | 9999px | pill |

---

### 1.3 Typography
- **Font family:** `Geist Sans` (var(--font-geist-sans)) → ui-sans-serif → system-ui → sans-serif
- **Font size scale (Tailwind defaults):**
  - `text-xs` = 12px / lh 16px
  - `text-sm` = 14px / lh 20px
  - `text-base` = 16px / lh 24px
  - `text-xl` = 20px / lh 28px
  - `text-2xl` = 24px / lh 32px
- **Used heading classes:**
  - Page titles: `text-xl font-semibold tracking-tight` (20px, 600, -0.015em)
  - Run detail title: `text-2xl font-semibold tracking-tight` (24px, 600)
  - Card titles: `CardTitle` component (shadcn, ~16px font-semibold)
  - Section labels (metadata): `text-xs font-medium uppercase tracking-wide` (12px, 500, uppercase, ~0.05em)
  - Body copy: `text-sm` (14px)
  - Captions: `text-xs` (12px)

---

### 1.4 Spacing Scale (frequently used)
| Tailwind | px |
|---|---|
| `gap-1` / `space-y-1` | 4px |
| `gap-1.5` | 6px |
| `gap-2` | 8px |
| `gap-3` | 12px |
| `gap-4` | 16px |
| `gap-6` | 24px |
| `gap-8` | 32px |
| `p-3` | 12px |
| `p-4` | 16px |
| `p-6` | 24px |
| `p-8` | 32px |
| `px-4 py-6` | 16px / 24px |
| `px-8 py-10` | 32px / 40px |

---

### 1.5 Size Reference
| Element | Tailwind | px |
|---|---|---|
| Sidebar width | `w-60` | 240px |
| TopBar height | `h-16` | 64px |
| Sidebar header height | `h-16` | 64px |
| Nav link height | `h-10` | 40px |
| Table row height | `h-14` | 56px |
| Button height (default) | `h-11` | 44px |
| Button height (explicit min) | `min-h-[2.75rem]` | 44px |
| Button height (small) | `h-8` | 32px |
| Icon (button internal) | `size-4` | 16px |
| Icon (sidebar nav) | `h-4 w-4` | 16px |
| Icon (sidebar header) | `h-5 w-5` | 20px |
| Icon (topbar) | `size-4` | 16px |
| Icon (empty state) | `size-6` | 24px |
| Icon (error state large) | `size-8` to `size-10` | 32–40px |
| Avatar (UserMenu) | `h-9 w-9` | 36px |
| Provider icon (connection card) | `size-8` | 32px |
| Google logo container | `size-5` | 20px |
| Google logo image | `size-4` | 16px |
| Status badge icon | `size-3` | 12px |
| Token expiry icon | `size-3.5` | 14px |
| Breadcrumb chevron | `size-3.5` | 14px |
| Checkmark badge (theme) | `size-3.5` | 14px |
| Checkmark icon inside | `size-2.5` | 10px |
| Sort icon (table) | `size-3` | 12px |

---

## 2. Layout Architecture

### 2.1 Shell Structure
```
<body> (min-h-screen, flex, bg-background, text-foreground)
  ├─ <Sidebar>          hidden md:flex, w-60, h-screen, border-r, bg-sidebar
  └─ <div>              flex min-w-0 flex-1 flex-col
       ├─ <TopBar>      sticky top-0 z-30, h-16, border-b
       └─ <main>        flex-1, id="main", tabIndex={-1}
            └─ {page}   px-4 py-6 md:px-8 md:py-10
```

### 2.2 Sidebar — pixel detail
- **Container:** `hidden md:flex flex-col h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground`
- **Header:** `flex items-center h-16 gap-2 px-6` — 64px tall, 24px horizontal padding, 8px gap between icon and label, `font-semibold tracking-tight`
- **Nav list:** `flex-1 px-3` (12px horizontal padding), `space-y-1` (4px between items)
- **Nav link:** `flex items-center h-10 gap-3 px-3 rounded-md text-sm transition-colors focus-visible:ring-ring focus-visible:ring-2 outline-none`
  - Inactive: `text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground`
  - Active: `bg-sidebar-accent text-sidebar-accent-foreground font-medium`
- **Footer:** `px-6 py-4` — 24px horizontal, 16px vertical, `text-xs text-muted-foreground`

### 2.3 TopBar — pixel detail
- **Element:** `<header role="banner">` — sticky, `top-0 z-30`, `h-16`, `flex items-center gap-4`
- **Padding:** `px-4 md:px-8` — 16px mobile, 32px tablet+
- **Background:** `bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- **Border:** `border-b border-border`
- **Mobile logo:** `md:hidden font-semibold tracking-tight` (icon + text)
- **Right content:** `ml-auto flex items-center gap-2` → ThemeToggle + UserMenu

### 2.4 UserMenu — pixel detail
- **Trigger:** `inline-flex items-center justify-center rounded-full` — wraps Avatar `h-9 w-9`
- **Focus ring:** `focus-visible:ring-2 focus-visible:ring-ring`
- **aria-label:** `"Account menu for {name}"`
- **Dropdown:** `w-56`, align `end`
- **Menu label section:** `flex flex-col gap-0.5` — name `text-sm font-medium`, email `truncate text-xs text-muted-foreground`
- **Menu items:** Settings (with UserIcon `size-4`), Sign out (disabled in Phase 1), separated by `<Separator>`

### 2.5 Content Area
- **Outer:** `flex min-w-0 flex-1 flex-col` — `min-w-0` prevents flex overflow
- **`<main>`:** `id="main" tabIndex={-1} flex-1 px-4 py-6 md:px-8 md:py-10`
  - Mobile: 16px H / 24px V padding
  - Tablet+: 32px H / 40px V padding

---

## 3. Pages

### 3.1 Login (`/login`)

**Outer container:** `flex min-h-screen items-center justify-center p-6`
- Background: `bg-background`
- 24px padding on all sides (prevents card touching edges on small screens)

**Card:** `max-w-[400px] w-full rounded-xl ring-1 ring-foreground/10 p-8 shadow-sm bg-card`
- Max-width: 400px (hard-coded, not a Tailwind size)
- Corner radius: 14px (`rounded-xl`)
- Border: 1px ring at 10% foreground opacity (subtle outline, no color)
- Padding: 32px all sides
- Shadow: `shadow-sm` (~0 1px 2px rgba(0,0,0,0.05))

**Heading:** `text-xl font-semibold tracking-tight text-card-foreground` — 20px, 600 weight, -0.015em tracking

**Subtitle:** `mt-2 text-sm text-muted-foreground` — 8px top margin, 14px, muted gray

**Google Sign-In Button:**
- `w-full h-11 rounded-lg px-4 bg-[#4285F4] text-sm font-medium text-white`
- Height: 44px — meets minimum touch target
- Corner radius: 10px (`rounded-lg`)
- Horizontal padding: 16px
- Background: hardcoded `#4285F4` (not a design token)
- `flex items-center gap-3` — icon + label, 12px gap
- Hover: `hover:opacity-90` (10% opacity reduction)
- Active: `active:opacity-80` (20% reduction)
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`
- Focus: `focus-visible:ring-2 focus-visible:ring-[#4285F4]/60 focus-visible:ring-offset-2` (brand-specific, not system ring)
- Aria: `aria-label="Sign in with Google"`

**Google Logo Container:** `size-5 bg-white p-0.5 rounded-sm` — 20px box, 2px padding, 6px radius, white bg to isolate colored SVG

**Google Logo SVG:** `size-4` — 16px

**Disclaimer text:** `mt-6 text-center text-xs text-muted-foreground` — 24px top margin, 12px, centered

---

### 3.2 Connections (`/connections`)

**Page container:** `flex flex-col gap-6` — 24px between header and content

**Header row:**
- Loading skeleton: title `h-7 w-40` (28px × 160px), subtitle `h-4 w-72 mt-1.5` (16px × 288px)
- Loaded: heading `text-xl font-semibold text-foreground` / subtitle `mt-1 text-sm text-muted-foreground`

**Connection Grid:**
- Loading: `grid grid-cols-1 gap-4 sm:grid-cols-2`
- Loaded: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Gap: 16px between cards

**Connection Card (loaded):**

*Outer:* `<article>` wrapping `<Card className="flex flex-1 flex-col">`

*CardHeader:* `border-b flex items-center gap-3 px-4 py-4`
- Left: provider icon `size-8 shrink-0` (32px)
- Center: `min-w-0 flex-1`
  - Title: `CardTitle` (shadcn, ~16px font-semibold)
  - Email: `mt-0.5 truncate text-xs text-muted-foreground` — 12px, truncated with ellipsis
- Right: `<StatusBadge>` component

*CardContent:* `flex min-h-[5rem] flex-col justify-between gap-3 pt-4`
- Min height 80px reserved to prevent card height variance
- Date info: `space-y-1 text-xs text-muted-foreground` — 4px gap between lines
  - Label: `font-medium text-foreground`
  - Value: `text-muted-foreground`

*Token Expiry Warning (conditional):*
- `flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs`
- Corner radius: 10px (`rounded-lg`)
- Border: 1px, 30% warning opacity
- Background: 10% warning opacity
- Padding: 12px H / 10px V
- Icon: `mt-0.5 size-3.5 shrink-0 text-warning-foreground` (14px, top-offset 2px)
- Reconnect link: `font-medium text-warning-foreground underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50`

*CardFooter:* `flex flex-wrap gap-2` — 8px between buttons
- Reconnect/Connect: `size="sm" min-h-[2.75rem] flex-1` — at least 44px tall, fills space
- Disconnect: separate `<DisconnectButton>` component, `size="sm"`

**Status Badge Component:**
- Base: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium`
- Corner radius: 9999px (pill)
- Padding: 10px H / 2px V
- Icon: `size-3` (12px), `shrink-0`
- Connected: `border-success/30 bg-success/10 text-success` — green
- Expired: `border-warning/30 bg-warning/10 text-warning-foreground` — amber
- Disconnected: `border-border bg-muted text-muted-foreground` — gray

**Connection Card Skeleton:**
- Header skeleton: icon `size-8 rounded-full bg-muted`, title `h-4 w-24`, email `h-3 w-32 mt-1`
- Status badge: `h-5 w-20 rounded-full`
- Content: two date rows, each `h-3` with varying widths
- Footer: two button skeletons `h-[2.75rem]` (one flex-1, one `w-24`)

**Empty State:**
- `flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center`
- Padding: 64px top/bottom, no horizontal padding
- Icon wrapper: `flex size-12 items-center justify-center rounded-full bg-muted` (48px circle)
- Icon: `size-6 text-muted-foreground` (24px)
- Heading: `mt-4 text-sm font-medium text-foreground` — 16px top margin
- Subtitle: `mt-1.5 max-w-sm text-sm text-muted-foreground` — 6px top margin, max 384px wide
- Button group: `mt-6 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3` — 24px top margin, max 512px wide, 12px gaps, stacks on mobile

**Error State:**
- `flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm`
- Corner radius: 14px, 16px all-around padding
- Icon: `mt-0.5 size-4 shrink-0 text-destructive` — 16px, 2px top offset
- Content `flex-1`: heading `font-medium text-destructive`, subtitle `mt-0.5 text-muted-foreground`
- Retry button: `variant="outline" size="sm" shrink-0`

---

### 3.3 Ad Accounts (`/ad-accounts`)

**Page container:** `flex flex-col gap-6`

**Header row:** `flex items-center justify-between gap-4`
- Title: `flex flex-col gap-0.5` — heading `text-xl font-semibold tracking-tight`, subtitle `text-sm text-muted-foreground`
- Add button: `shrink-0`, icon `size-4 aria-hidden="true"`, label "Add ad account"

**Desktop Table** (`hidden md:block`):
- Wrapper: `rounded-xl border` — 14px radius, 1px border
- `<Table>` inside
- `TableHeader`: `hover:bg-transparent` override (no hover on header rows)
- Column headers: "Name" | "FB Account ID" | "Enabled" | "Schedule" | "Last Run" | (actions)
  - Sort buttons: `inline-flex items-center font-medium text-foreground hover:text-foreground/80 focus-visible:underline`
  - Sort icon (inactive): `ml-1 inline size-3 text-muted-foreground`
  - Sort icon (active): `ml-1 inline size-3 text-foreground`

**Desktop Table Row:**
- Height: `h-14` (56px)
- Focus: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset`
- Hover: `hover:bg-muted/50`
- Keyboard: `onKeyDown` → Enter triggers navigation to detail page
- Name cell: `min-w-[160px] max-w-[240px]`
  - Link: `font-medium text-foreground hover:underline focus-visible:underline`
- FB Account ID cell: `min-w-[180px]`, monospace font class, truncated via `<Tooltip>` on hover
- Enabled: `<EnabledToggle>` component (Switch)
- Schedule cell: `min-w-[140px]`, `text-xs` or `text-xs text-muted-foreground` if empty
- Last Run: `<LastRunBadge>` component
- Actions: `<DropdownMenu>` with Edit / Run Now / Delete items

**Mobile Card** (`block md:hidden`):
- `rounded-xl border bg-card p-4 flex flex-col gap-3`
- Corner radius: 14px, 16px padding, 12px between sections
- Header: `flex items-start justify-between gap-2`
  - Name/ID: `min-w-0` (prevents overflow)
  - Actions dropdown: `h-11 w-11 rounded-lg` trigger (44px square touch target, 10px radius)
- Body: schedule row `flex items-center gap-2 text-xs`, last run `flex items-start gap-2`
- Footer: `flex items-center justify-between gap-3 pt-1 border-t`
  - Toggle: `flex items-center gap-2`
  - Run Now button: `min-h-[44px]`

**Loading Skeleton (Desktop):**
- Header: same structure as real page with skeleton elements
- Table wrapper `rounded-xl border`
- 5 skeleton rows, each `h-14`
- Columns: approximate width skeletons for name, ID, enabled, schedule, last run

**Loading Skeleton (Mobile):**
- 3 card skeletons, each `h-[168px]`

**Empty State:**
- `flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center`
- Icon: `rounded-full bg-muted p-3` + `size-6` icon
- Heading: `text-sm font-medium`
- Subtitle: `text-sm text-muted-foreground`
- CTA: `size="default"` button with Plus icon

---

### 3.4 Ad Account Form (`/ad-accounts/new`, `/ad-accounts/[id]`)

**Container:** `mx-auto max-w-4xl space-y-6` — centered, max 896px, 24px between sections

**Breadcrumb (loaded):**
- `<nav aria-label="breadcrumb">` → `<ol>` → `<li>` items
- Link style: `flex items-center gap-1.5 text-sm text-muted-foreground`
- Chevron separator: `<ChevronRightIcon>` `size-3.5` (14px)
- Current item: `max-w-[200px] truncate text-foreground` with `aria-current="page"`

**Breadcrumb (loading):** `h-4 w-32 animate-pulse rounded bg-muted`

**Page heading:** `text-xl font-semibold tracking-tight` — 20px  
**Description:** `mt-1 text-sm text-muted-foreground`  
**Loading skeletons:** heading `h-6 w-48`, description `h-4 w-72`

**Error State:**
- `flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center`
- Padding: 32px, corner radius 14px
- Icon circle: `flex size-12 items-center justify-center rounded-full bg-destructive/10` (48px)
- Icon: `size-6 text-destructive` (24px)
- Heading: `text-base font-semibold`
- Message: `mt-1 text-sm text-muted-foreground`
- Buttons: `flex items-center gap-2`

**Form sections (`space-y-8`, each section `space-y-4`):**
- Section labels: `text-sm font-semibold` headings inside `<FormSection>` wrapper
- Input rows: full-width `w-full` inputs
- Checkbox groups: `grid grid-cols-2 gap-2` or `grid grid-cols-3 gap-2`
- Slider: `DateWindowSlider` custom component
- Cron builder: `CronBuilder` — 5-field cron expression UI

---

### 3.5 Runs (`/runs`)

**Page container:** `flex flex-col gap-6`  
**Header:** heading `text-xl font-semibold` (**missing `tracking-tight`** vs all other pages), subtitle `mt-1 text-sm text-muted-foreground`

**Runs Table (loading skeleton):**
- Filter bar: `flex items-center gap-2` — two pill skeletons
- Table wrapper: `rounded-xl ring-1 ring-foreground/10` (ring instead of border — different from ad accounts table `border`)
- Header row: `flex items-center border-b bg-card px-2 py-2.5` — column skeletons with `mr-4`
- Body rows (×8): `flex items-center border-b px-2 py-3 last:border-0`
  - 8px horizontal padding (vs 16px in ad accounts table)
  - Cell skeletons with `flex-shrink-0` widths
- Pagination: `flex items-center justify-between pt-2` — info skeleton `h-5 w-20`, buttons `flex gap-1` with 4 × `size-7 rounded-md` skeletons

**Runs Table (loaded):**
- `TableHeader` with `hover:bg-transparent`
- Columns: "When" | "Scenario" | "Account" | "Trigger" | "Status" | "Rows Written" (`hidden md`) | "Duration" (`hidden md`) | Details
- Run Row: status badge `<RunStatusBadge>`, trigger badge (Manual/Watch/Schedule with brand colors), duration formatted

---

### 3.6 Run Detail (`/runs/[id]`)

**Container:** `mx-auto max-w-4xl space-y-8` — 896px max, 32px between sections (larger gap than other pages which use `space-y-6`)

**Breadcrumb:** `flex items-center gap-1 text-sm text-muted-foreground`, chevron `size-3.5`

**Title row:** `flex flex-wrap items-start gap-3 sm:items-center`
- Heading: `text-2xl font-semibold tracking-tight` — 24px (only page with `text-2xl`)
- Badge row: `flex flex-wrap items-center gap-2` — status badge + trigger badge

**Account subtitle:** `text-sm text-muted-foreground` with account name as `font-medium text-foreground`

**Metadata Grid:**
- `grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2 md:grid-cols-4`
- Background: 30% muted opacity (very subtle tint)
- Corner radius: 14px, 16px padding, 16px gaps
- Single column mobile → 2 col tablet → 4 col desktop
- Each item `<MetadataItem>`: `flex flex-col gap-1`
  - Label `<dt>`: `text-xs font-medium uppercase tracking-wide text-muted-foreground` (12px, 500, uppercase, wide tracking)
  - Value `<dd>`: `text-sm font-medium text-foreground` (14px, 500)

**Error State:**
- `flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center`
- Padding: 24px H / 48px V
- Icon: `size-10 text-destructive` (40px — largest error icon in the app)
- Heading: `text-base font-semibold text-foreground`
- Retry: `variant="outline"`

---

### 3.7 Settings (`/settings`)

**Container:** `mx-auto max-w-2xl space-y-6` — max 672px, narrower than form pages (896px)

**Heading:** `text-xl font-semibold tracking-tight` / subtitle `mt-1 text-sm text-muted-foreground`

**Error State:**
- `flex flex-col items-center gap-4 rounded-xl border border-border py-16 text-center`
- Note: uses `border-border` (neutral), not `border-destructive` — softer error presentation
- Icon: `size-8 text-muted-foreground` (32px, muted — not destructive red)
- Retry: `variant="outline" gap-1.5`

**Profile Section:**
- Card: title "Profile", description "Your identity as seen by this dashboard. Read-only in Phase 1."
- Content: `flex items-center gap-4` (16px gap)
- Avatar: `size="lg"`, fallback 2-char initials
- Data list: `dl space-y-1`
  - `dt`: `text-xs text-muted-foreground` (12px)
  - `dd` (name): `text-sm font-medium text-foreground`
  - `dd` (email): `text-sm text-foreground`

**Appearance Section:**
- Card: title "Appearance", description "Choose how the dashboard looks."
- Theme selector: `role="radiogroup" aria-label="Theme" grid grid-cols-3 gap-2`
- Each theme button:
  - `role="radio" flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors`
  - Padding: 16px all sides, corner radius 10px (`rounded-lg`)
  - Gap between icon and label: 8px
  - Icon: `size-5` (20px)
  - Unselected: `border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground`
  - Selected: `border-primary bg-primary/5 text-primary`
  - Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
  - Checkmark badge (selected only): `absolute -right-2 -top-2 flex size-3.5 items-center justify-center rounded-full bg-primary`
    - Position: -8px from top-right corner of button
    - Size: 14px circle, `bg-primary`
    - Icon inside: `size-2.5 text-primary-foreground` (10px check)

**Timezone Section:**
- Card: title "Timezone"
- `Select` component, `w-full`
- Clock display: `flex items-center gap-1.5 text-sm text-muted-foreground`
  - Icon: `size-3.5 shrink-0` (14px)
  - Time: `font-medium tabular-nums text-foreground` — tabular numbers prevent width jitter
  - Updates every 60,000ms (1 minute)

**Danger Zone:**
- **Not** a Card — plain `rounded-xl border border-error/40 p-6`
  - Note: uses `--error` token, not `--destructive` (semantic difference)
- Heading: `mb-1 text-sm font-semibold text-error` with `id` for `aria-labelledby`
- Description: `mb-4 text-sm text-muted-foreground` — 16px bottom margin before action row
- Action row: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
  - Action label: `text-sm font-medium text-foreground`
  - Warning: `text-xs text-muted-foreground`
  - Button: `variant="destructive" shrink-0`, icon `size-4`, `aria-haspopup="dialog"`

---

## 4. Component Inventory

### 4.1 shadcn/ui Primitives Used
Alert, AlertDialog, Avatar (AvatarImage, AvatarFallback), Badge, Button, Card (CardHeader, CardTitle, CardDescription, CardContent, CardFooter), Checkbox, Command, Dialog, DropdownMenu (full set), Input, Label, Popover, Progress, ScrollArea, Select (full set), Separator, Sheet, Skeleton, Sonner (toast), Switch, Table (full set), Tabs, Tooltip (TooltipProvider, TooltipTrigger, TooltipContent)

Custom extensions: `InputGroup`, `InputGroupAddon`, `InputGroupInput`

### 4.2 Custom Components
| Component | File Location | Notes |
|---|---|---|
| ConnectionCard | components/connections/ConnectionCard.tsx | `<article>` wrapper |
| ConnectionStatus | components/connections/ConnectionStatus.tsx | Status badge |
| TokenExpiryWarning | components/connections/TokenExpiryWarning.tsx | Inline warning |
| DisconnectDialog | components/connections/DisconnectDialog.tsx | AlertDialog |
| ConnectionsClient | components/connections/ConnectionsClient.tsx | tRPC client wrapper |
| BitrixConnectionCard | components/connections/BitrixConnectionCard.tsx | Bitrix-specific card |
| AdAccountCard | components/ad-accounts/AdAccountCard.tsx | Mobile card |
| AdAccountRow | components/ad-accounts/AdAccountRow.tsx | Desktop table row |
| AdAccountsTable | components/ad-accounts/AdAccountsTable.tsx | Table + mobile toggle |
| AdAccountEmptyState | components/ad-accounts/AdAccountEmptyState.tsx | |
| EnabledToggle | components/ad-accounts/EnabledToggle.tsx | Switch with optimistic |
| LastRunBadge | components/ad-accounts/LastRunBadge.tsx | Relative time + status |
| RunNowButton | components/ad-accounts/RunNowButton.tsx | Spinner state |
| AdAccountForm | components/ad-accounts/AdAccountForm.tsx | Full form |
| FbAccountPicker | components/ad-accounts/FbAccountPicker.tsx | |
| LevelCheckboxes | components/ad-accounts/LevelCheckboxes.tsx | |
| MetricsMultiSelect | components/ad-accounts/MetricsMultiSelect.tsx | |
| DateWindowSlider | components/ad-accounts/DateWindowSlider.tsx | |
| CronBuilder | components/ad-accounts/CronBuilder.tsx | 5-field cron UI |
| UnsavedChangesGuard | components/ad-accounts/UnsavedChangesGuard.tsx | Navigation block |
| RunsClient | components/runs/RunsClient.tsx | |
| RunsTable | components/runs/RunsTable.tsx | |
| RunRow | components/runs/RunRow.tsx | |
| RunStatusBadge | components/runs/RunStatusBadge.tsx | With pulse animation |
| RunsEmptyState | components/runs/RunsEmptyState.tsx | |
| RunsFilters | components/runs/RunsFilters.tsx | |
| RunsPagination | components/runs/RunsPagination.tsx | |
| RunDetailHeader | components/runs/RunDetailHeader.tsx | |
| RunMetadataGrid | components/runs/RunMetadataGrid.tsx | 4-col grid |
| RunLogTimeline | components/runs/RunLogTimeline.tsx | `ul > li` timeline |
| RunErrorPanel | components/runs/RunErrorPanel.tsx | |
| RunSheetsLink | components/runs/RunSheetsLink.tsx | |
| RunLogEntry | components/runs/RunLogEntry.tsx | |
| ProfileSection | components/settings/ProfileSection.tsx | |
| ThemeSection | components/settings/ThemeSection.tsx | Radio group |
| TimezoneSection | components/settings/TimezoneSection.tsx | Live clock |
| DangerZone | components/settings/DangerZone.tsx | |
| DeleteDataDialog | components/settings/DeleteDataDialog.tsx | |
| Sidebar | components/layout/Sidebar.tsx | |
| TopBar | components/layout/TopBar.tsx | |
| UserMenu | components/layout/UserMenu.tsx | |
| AllowlistGate | components/auth/AllowlistGate.tsx | |
| LoginCard | components/auth/LoginCard.tsx | |
| GoogleSignInButton | components/auth/GoogleSignInButton.tsx | |

---

## 5. States Coverage

### 5.1 All Screens — State Matrix
| Screen | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Connections | Skeleton (card grid) | Dashed border + icon + CTA | Red banner + retry | Card grid |
| Ad Accounts | Skeleton (table + cards) | Dashed border + icon + CTA | (falls through to empty) | Table / cards |
| Ad Account Form | Skeleton (form fields) | N/A | Centered error + back btn | Form |
| Runs | Skeleton (table rows) | Centered icon + text | (assumed) | Table |
| Run Detail | Skeleton (header + grid) | N/A | Centered error + retry | Full detail |
| Settings | SettingsSkeleton | N/A | Centered icon + retry | Sections |
| Login | N/A | N/A | N/A | Form |

### 5.2 Loading Skeleton Pattern
- All skeletons use `animate-pulse` on the wrapper (Tailwind: `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`)
- Heights mirror real content dimensions exactly to prevent layout shift
- Skeleton widths vary to simulate real text variance (`w-20`, `w-24`, `w-32`, `w-40`, `w-48`, `w-56`, `w-64`, `w-72`)
- Skeleton color: `bg-muted` (matches `oklch(0.97 0 0)` in light / `oklch(0.269 0 0)` in dark)

### 5.3 RunStatusBadge Pulse Animation
```tsx
// motion-safe: ensures prefers-reduced-motion is respected
<span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
```
- Only on Running status
- Ping animation: `@keyframes ping { 75%,100%{transform:scale(2);opacity:0} }`
- Duration: 1s infinite

---

## 6. Responsive Behavior

### 6.1 Breakpoints Used
| Prefix | Min-width | Usage |
|---|---|---|
| `sm:` | 640px | 2-col grids, flex-row in settings, form layouts |
| `md:` | 768px | Sidebar appears, desktop table, extra table cols, larger padding |
| `lg:` | 1024px | 3-col connection grid |

No `xl:` or `2xl:` breakpoints anywhere. Max content width is `max-w-4xl` (896px) for forms, `max-w-2xl` (672px) for settings, unconstrained for connections/ad-accounts.

### 6.2 Responsive Patterns
| Pattern | Mobile | Tablet+ |
|---|---|---|
| Sidebar | Hidden | Visible (240px fixed) |
| Page padding | `px-4 py-6` (16/24px) | `px-8 py-10` (32/40px) |
| Connections grid | 1 column | 2 col (sm) / 3 col (lg) |
| Ad accounts | Mobile cards | Desktop table |
| Runs table columns | Fewer columns | Rows Written + Duration visible |
| Run detail metadata | 1 col → 2 col | 4 col (md) |
| Settings danger zone | Stack | Side-by-side (sm) |
| Theme selector | Always 3 col grid | Always 3 col grid |
| Empty state CTA | 1 col buttons | 3 col (sm) |
| TopBar logo | Visible | Hidden |

---

## 7. Accessibility

### 7.1 ARIA Attributes Inventory
| Attribute | Applied To |
|---|---|
| `aria-label` | Icon-only buttons, UserMenu trigger, table elements, Google sign-in btn, theme selector |
| `aria-current="page"` | Active breadcrumb item, active sidebar nav link |
| `aria-hidden="true"` | Decorative icons, dividers, pulse background spans |
| `aria-busy="true"` | Loading table/list containers |
| `role="alert"` | Error message containers |
| `role="radiogroup"` | Theme selector container |
| `role="radio"` | Individual theme option buttons |
| `role="status"` | Connection status text |
| `role="banner"` | TopBar `<header>` element |
| `aria-haspopup="dialog"` | Danger Zone delete button |
| `aria-labelledby` | Danger Zone section (points to heading id) |
| `aria-checked` | Radio/checkbox states (managed by shadcn) |
| `aria-expanded` | Dropdown menus (managed by Radix) |
| `tabIndex={-1}` | `<main>` element (for skip-link focus target) |

### 7.2 Semantic HTML
- `<header role="banner">` — TopBar
- `<nav aria-label="breadcrumb">` — breadcrumbs
- `<nav>` — sidebar navigation
- `<main id="main">` — content area
- `<article>` — ConnectionCard
- `<section>` — settings sections
- `<dl>/<dt>/<dd>` — profile data, run metadata
- `<table>/<thead>/<tbody>/<tr>/<th>/<td>` — data tables
- `<ul>/<li>` — log timeline

### 7.3 Keyboard Navigation
- **Ad account table rows:** `onKeyDown` handler — Enter key triggers `router.push` to detail
- **Theme selector:** Arrow keys + Enter via Radix radio behavior
- **Dropdown menus:** Full keyboard support via Radix DropdownMenu
- **Dialogs:** Trap focus, Escape closes (Radix Dialog)
- **All interactive elements:** `focus-visible:` classes (not `focus:`, so keyboard-only focus rings)

### 7.4 Motion / Animation
- `motion-safe:animate-ping` on running status badge — respects `prefers-reduced-motion: reduce`
- Skeleton `animate-pulse` is not guarded by `motion-safe:` — always animates
- `transition-colors` on nav links and theme buttons — CSS transitions, no `prefers-reduced-motion` guard

### 7.5 Focus Ring Inventory
| Location | Ring Class |
|---|---|
| Google sign-in button | `focus-visible:ring-[#4285F4]/60 ring-offset-2` |
| Sidebar nav links | `focus-visible:ring-ring ring-2` |
| UserMenu trigger | `focus-visible:ring-ring ring-2` |
| Default buttons (shadcn) | `focus-visible:ring-ring ring-2 ring-offset-2` |
| Ad account table rows | `focus-visible:ring-primary ring-inset ring-2` |
| Token expiry link | `focus-visible:ring-ring/50 rounded-sm ring-2` |
| Theme selector buttons | `focus-visible:ring-ring ring-offset-2 ring-2` |
| Form inputs (shadcn) | `focus-visible:ring-ring ring-2` |

---

## 8. Animations & Transitions

| Effect | Class | Trigger | Notes |
|---|---|---|---|
| Skeleton pulse | `animate-pulse` | Always during loading | Not motion-safe guarded |
| Button spinner | `animate-spin` on Loader2 | Submitting/loading | Inside button, replaces icon |
| Status ping | `motion-safe:animate-ping` | Running status only | Respects reduced motion |
| Color transitions | `transition-colors` | Hover/focus | On nav links, theme buttons |
| Opacity transitions | `hover:opacity-90 active:opacity-80` | Button hover/click | Google sign-in btn |

No custom CSS keyframes in component code. All animations use Tailwind built-ins and `@tw-animate-css` import.

---

## 9. Issues & Inconsistencies

### Critical
None that break functionality.

### High (visual / accessibility)

**H1 — Focus ring system not unified**
- Login button: `ring-[#4285F4]/60` (brand color)
- Ad account rows: `ring-primary ring-inset` (primary + inset offset)
- Token expiry link: `ring-ring/50 rounded-sm`
- Everything else: `ring-ring`
- Impact: inconsistent keyboard navigation experience; brand blue focus on login jarring vs gray everywhere else

**H2 — Missing skip-to-content link**
- `<main tabIndex={-1} id="main">` is present for focus targeting but there is no `<a href="#main">Skip to content</a>` link in the DOM
- Impact: keyboard-only users must tab through full sidebar and topbar on every navigation

**H3 — Ad account table rows not keyboard reachable**
- `onKeyDown Enter` handler exists but the `<tr>` has no `tabIndex` attribute and no `role`
- Impact: keyboard users cannot focus rows, cannot activate them — keyboard nav to ad account detail is broken

**H4 — `animate-pulse` not guarded by `motion-safe:`**
- Skeleton loading animations fire unconditionally
- Impact: users with `prefers-reduced-motion: reduce` still see pulsing skeletons

### Medium (polish)

**M1 — Runs page heading missing `tracking-tight`**
- `text-xl font-semibold` vs `text-xl font-semibold tracking-tight` on all other pages
- Visible difference at 20px: ~0.3px wider letter spacing on Runs heading

**M2 — Table wrapper style inconsistency**
- Ad accounts table: `rounded-xl border` (1px `border-border`)
- Runs table: `rounded-xl ring-1 ring-foreground/10` (1px ring at 10% opacity)
- Both appear similar but differ in rendering — `ring` is inside, `border` is outside box model

**M3 — Button height enforcement inconsistent**
- Some: `min-h-[2.75rem]` (44px minimum, allows growth)
- Some: `h-11` (44px fixed)
- Some: `h-8` (32px — below 44px WCAG touch target)
- Topbar UserMenu trigger: `h-9 w-9` (36px — below touch target minimum)

**M4 — Hardcoded hex colors not in token system**
- `bg-[#4285F4]` (Google sign-in)
- `text-bitrix-cyan` (likely `--bitrix-cyan: #2FC6F6` in globals.css — not a standard shadcn token)
- `#1877f2` (Facebook — possibly inlined in component)
- Impact: cannot retheme; dark mode doesn't affect these

**M5 — Empty state padding not responsive**
- `py-16` (64px top + bottom) on all screen sizes
- On a 375px × 667px phone with keyboard visible (~300px height), 128px of vertical empty state padding leaves ~100px for actual content
- No `sm:py-` adjustment

**M6 — `space-y-8` vs `space-y-6` section spacing inconsistency**
- Settings: `space-y-6` between sections (24px)
- Form pages: `space-y-8` between sections (32px)
- Run detail: `space-y-8` between sections (32px)
- Other pages: `gap-6` (24px)
- Not wrong, but undocumented — unclear if intentional hierarchy

**M7 — Metadata label style used only in run detail**
- `text-xs font-medium uppercase tracking-wide` labels appear only in `RunMetadataGrid`
- Settings profile uses `text-xs text-muted-foreground` (lowercase, lighter weight)
- No documented rule for when to use uppercase tracking labels

**M8 — Connection card `min-h-[5rem]` creates dead space**
- 80px minimum on card content area
- Cards with only connected date info use ~40px of real content, leaving ~40px empty
- Different cards have visibly different content heights despite same min-height

### Low (minor)

**L1 — `border-error/40` vs `border-destructive/30`**
- Danger Zone: `border-error/40`
- Error states: `border-destructive/30`
- Both map to red but use different token names and opacity values

**L2 — Settings error icon is muted, not destructive**
- Settings error state uses `size-8 text-muted-foreground` (gray icon)
- All other error states use `text-destructive` (red icon)
- Likely intentional softening for settings page, but undocumented

**L3 — Run detail `space-y-8` vs all others `space-y-6`**
- See M6 above — the 32px vs 24px section gap makes run detail feel more spacious, which may be intentional for a data-dense page

**L4 — Skeleton pulse all-in-sync**
- All skeleton elements in a single wrapper animate at the same phase
- Staggered `animation-delay` per child would feel more natural but requires custom CSS

**L5 — Mobile ad account card actions trigger is `h-11 w-11` but surrounded by `gap-2`**
- Button itself is 44px × 44px (meets target)
- But at 44px wide it takes up 44/375 = ~12% of screen width just for the actions trigger
- Could be `h-9 w-9` with a larger invisible tap zone via padding trick

**L6 — `tabular-nums` only applied to timezone clock**
- Other numeric values (run duration, row count) don't use `tabular-nums`
- Numbers in tables and metadata grids can cause subtle width jitter when values change

---

## 10. Complete Token Cross-Reference

### Semantic → Usage Map
| Token | Where Used |
|---|---|
| `bg-background` | Page background, TopBar |
| `bg-card` | Cards, table headers |
| `bg-muted` | Skeleton, empty state icon circle, table hover |
| `bg-muted/30` | Run metadata grid background |
| `bg-muted/50` | Card footer background, table row hover |
| `bg-sidebar` | Sidebar background |
| `bg-sidebar-accent` | Active nav link background |
| `bg-sidebar-accent/60` | Hovered inactive nav link |
| `bg-primary/5` | Selected theme button background |
| `bg-destructive/5` | Error state page background |
| `bg-destructive/10` | Error state icon circle |
| `bg-warning/10` | Token expiry warning background |
| `bg-success/10` | Connected status badge background |
| `text-foreground` | Primary body text, headings |
| `text-muted-foreground` | Secondary text, captions, labels |
| `text-sidebar-foreground/80` | Inactive nav links |
| `text-sidebar-accent-foreground` | Active nav link text |
| `text-destructive` | Error text, error icons |
| `text-warning-foreground` | Warning text |
| `text-success` | Connected badge text |
| `text-primary` | Selected theme button text |
| `border-border` | Standard dividers, card borders |
| `border-destructive/30` | Error state card borders |
| `border-warning/30` | Warning inset borders |
| `border-success/30` | Connected badge border |
| `border-error/40` | Danger zone section border |
| `border-dashed` | Empty state containers |
| `ring-ring` | Focus rings (standard) |
| `ring-primary` | Focus rings (ad account rows) |
| `ring-foreground/10` | Card outline (connections, runs table) |
