# adsync — Design Tokens (locked 2026-05-14)

This file is the source of truth for which tokens exist. Phase C extends it; Phase A only locks it.

All tokens live in `src/styles/globals.css` inside the `@theme inline` block (light defaults) and the `.dark { ... }` block (dark overrides). Tailwind 4 reads them directly — there is no `tailwind.config.ts`.

## Colors — semantic

| Token | Usage |
|---|---|
| `--color-background` / `--color-foreground` | Page background + primary text |
| `--color-card` / `--color-card-foreground` | Card surface |
| `--color-popover` / `--color-popover-foreground` | Popovers, dropdowns |
| `--color-primary` / `--color-primary-foreground` | Primary CTA |
| `--color-secondary` / `--color-secondary-foreground` | Secondary actions |
| `--color-muted` / `--color-muted-foreground` | Muted surfaces + text |
| `--color-accent` / `--color-accent-foreground` | Accent surfaces |
| `--color-destructive` / `--color-destructive-foreground` | Destructive actions |
| `--color-border` | All borders |
| `--color-input` | Input borders |
| `--color-ring` | Focus rings |

## Colors — status

| Token | Use |
|---|---|
| `--color-status-queued` | Run pending |
| `--color-status-running` | Run in progress |
| `--color-status-success` | Run succeeded |
| `--color-status-failed` | Run failed |
| `--color-status-warning` | Run partial / warning |
| `--color-success` / `--color-success-foreground` | Generic success surfaces |
| `--color-warning` / `--color-warning-foreground` | Generic warning surfaces |

## Colors — brand / integration

| Token | Brand |
|---|---|
| `--color-brand-google` | Google |
| `--color-brand-facebook` | Facebook |
| `--color-brand-bitrix` | Bitrix24 |
| `--color-fb-blue` | Facebook accent |
| `--color-sheets-green` | Google Sheets accent |
| `--color-bitrix-cyan` | Bitrix24 accent |
| `--color-schedule-slate`, `--color-manual-indigo`, `--color-watch-violet`, `--color-webhook-emerald` | Trigger module accents |

## Sidebar

`--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-primary`, `--color-sidebar-primary-foreground`, `--color-sidebar-accent`, `--color-sidebar-accent-foreground`, `--color-sidebar-border`, `--color-sidebar-ring`.

## Charts

`--color-chart-1` … `--color-chart-5`.

## Radii

Base `--radius: 0.625rem`. Derived: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-4xl`.

## Typography

- Stacks: `--font-sans` (body, includes `--font-geist-sans`), `--font-heading`.
- Semantic ramp (added 2026-05-14): `--text-display` (36px), `--text-h1` (24px), `--text-h2` (20px), `--text-body` (15px), `--text-caption` (13px). Use as `text-display`, `text-h1`, etc. via Tailwind.

## Motion (added 2026-05-14)

- Durations: `--duration-fast` (120ms), `--duration-normal` (200ms), `--duration-slow` (320ms).
- Easings: `--ease-standard`, `--ease-emphasized`, `--ease-decelerate`.
- All non-essential animations are gated by `prefers-reduced-motion` (block at bottom of `globals.css`).

## Rules

- **No hex literals in components.** Every color reference goes through a token (`text-foreground`, `bg-card`, etc.).
- **No raw durations in components.** Use the motion tokens.
- **Adding a new token = update this file in the same commit.**
