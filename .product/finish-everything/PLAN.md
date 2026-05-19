# Finish-Everything — Master Plan

**Goal:** ship every P0/P1/P2 item from the audit in one rolling pass. Designed for parallel Codex execution: 5 independent batches dispatched concurrently, each verified locally, then one integration gate.

**Repo:** `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`
**Branch:** `phase-a-foundation` (do NOT switch)
**Read first:** `CLAUDE.md`, `docs/MODULE_AUDIT.md`, `docs/SMOKE_TEST.md`

---

## Dispatch sequence

```
┌─────── PARALLEL (group 1) ──────────────────────────────────────┐
│                                                                 │
│  ┌─ BATCH A ─┐  ┌─ BATCH B ─┐  ┌─ BATCH C ─┐  ┌─ BATCH D ─┐    │
│  │  pickers  │  │  webhook  │  │ run viewer│  │ templates │    │
│  │ + valid.  │  │  receiver │  │ + retry   │  │  picker   │    │
│  │ + cleanup │  │           │  │ + CSV     │  │           │    │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │
│        │              │              │              │          │
│        ▼              ▼              ▼              ▼          │
│   (gate A)        (gate B)       (gate C)       (gate D)       │
│                                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌────────── SEQUENTIAL (group 2) ─────────────────────────────────┐
│                                                                 │
│              ┌─ BATCH E ─┐                                      │
│              │ connection│   ← may touch ScheduleConfig         │
│              │   health  │     which Batch A also touches       │
│              │ + sched   │     (different sections; safe).      │
│              │  preview  │                                      │
│              └─────┬─────┘                                      │
│                    ▼                                            │
│              (gate E)                                           │
│                                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                  INTEGRATION GATE
                  (whole-repo pnpm typecheck + lint + test
                   + verify-canonical probe + dev-server boot)
```

**Parallel-safe analysis** (file isolation):

| Batch | Touches | Conflicts with |
|---|---|---|
| A | StepCard, StepConfigModal, ScenarioBuilder, modules.ts, delete orphan | — |
| B | new `/api/webhook/[scenarioId]/route.ts`, module-handlers.ts (webhook handler only), run-context.ts | — |
| C | runs router, RunDetailClient, StepResultCard, new CsvExportButton | — |
| D | NewScenarioClient, new TemplatePicker, scenario-templates.ts (read-only) | — |
| E | ConnectionCard, ConnectionsClient, ScheduleConfig (next-run preview section only) | A's ScheduleConfig section is untouched — safe |

Dispatch A+B+C+D as 4 parallel `codex:codex-rescue` agents. When all four return green, dispatch E.

---

## Global conventions (every batch reads these)

1. **No commits, no pushes** — leave working tree dirty for review.
2. **No new dependencies** — use what's installed.
3. **Style:** TailwindCSS 4 + shadcn/ui + base-ui. `cn(...)` for class merge.
4. **Server I/O:** every new `app/api/**` route must declare `export const runtime = "nodejs";`.
5. **tRPC:** new procedures go through `authedProcedure` unless explicitly public (webhook receiver is public).
6. **Typography:** body text not bold. Headings `text-lg` or `text-base` with normal weight.
7. **Mobile:** breakpoints `md:` = 768px, `lg:` = 1024px. Test mental-model at 375px width.
8. **No `console.log`.** No `any`. No `// @ts-ignore` without reason.
9. **Hydration:** never call `Date.now()`/`Math.random()`/`crypto.randomUUID()` in render bodies, `useMemo`, or lazy `useState` init. Use stable seeds.
10. **Prisma migrations:** `pnpm prisma migrate dev --name <slug>`. Commit the generated SQL.
11. **Verification gate per batch:**
    ```powershell
    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm tsx --conditions react-server scripts/verify-canonical.ts
    ```
    All must be exit 0 / clean / 74+/74+ / 23/23. If any fail, **revert the batch's own changes and report what broke**.
12. **Don't touch files outside your batch's listed paths.** If you find a needed change elsewhere, surface it in your report; don't unilaterally edit it.

---

## What gets shipped

### P0 — blocks usability
- **B7** Unblock 3 wrongly-deferred modules (`trigger.webhook`, `trigger.watch.bitrix_new_lead`, `fb.list_ad_accounts`) in `validateStepConfig`. → Batch A
- **B8** Render `errors._form` as a banner inside `StepConfigModal` so the user sees WHY save is blocked. → Batch A
- **Webhook receiver route + handler context wiring** so `trigger.webhook` is functional end-to-end. → Batch B

### P1 — major UX cleanup
- Replace `TriggerPickerCards` + `ActionPickerCards` with a single "Browse modules" entry point that opens `ModuleLibraryModal`. → Batch A
- Remove `sheets.watch_new_rows` from the catalog (no handler, no config UI). → Batch A
- Delete orphan `BitrixCreateSmartProcessItemConfig.tsx`. → Batch A
- Run detail page: show step output rows (not just count) with column headers, pagination at 100 rows. → Batch C
- Retry-failed-run button on `/runs/[id]`. → Batch C

### P2 — quality of life
- Scenario template picker on `/scenarios/new` (the catalog already exists). → Batch D
- Connection card: `lastVerifiedAt` badge + manual "Verify now" button. → Batch E
- Schedule trigger config: live "Next run: …" preview under the cron field. → Batch E
- CSV export on run detail. → Batch C

### Out of scope (not in this plan)
- Run cancellation mid-execution
- Multi-account ad pulling UI
- Email/Slack alerts on run failure
- Pricing/billing
- Per-step rate limiting

---

## Files this plan creates / modifies

```
modified:
  src/components/scenarios/builder/StepCard.tsx                  (Batch A)
  src/components/scenarios/builder/StepConfigModal.tsx           (Batch A)
  src/components/scenarios/builder/ScenarioBuilder.tsx           (Batch A)
  src/lib/modules.ts                                             (Batch A)
  src/server/api/routers/modules.ts                              (Batch A — Zod enum)
  src/server/api/routers/scenarios.ts                            (Batch A — Zod enum)
  src/server/core/module-handlers.ts                             (Batch A + B)
  src/server/core/run-context.ts                                 (Batch B)
  src/server/api/routers/runs.ts                                 (Batch C)
  src/components/runs/StepResultCard.tsx                         (Batch C)
  src/app/(dashboard)/runs/[id]/RunDetailClient.tsx              (Batch C)
  src/app/(dashboard)/scenarios/new/NewScenarioClient.tsx        (Batch D)
  src/components/connections/ConnectionCard.tsx                  (Batch E)
  src/components/connections/ConnectionsClient.tsx               (Batch E)
  src/server/api/routers/connections.ts                          (Batch E)
  src/components/scenarios/builder/modules/ScheduleConfig.tsx    (Batch E)
  prisma/schema.prisma                                           (Batch B + E — migrations)

created:
  src/app/api/webhook/[scenarioId]/route.ts                      (Batch B)
  src/components/runs/CsvExportButton.tsx                        (Batch C)
  src/components/scenarios/TemplatePicker.tsx                    (Batch D)
  src/lib/cron-preview.ts                                        (Batch E)

deleted:
  src/components/scenarios/builder/modules/BitrixCreateSmartProcessItemConfig.tsx  (Batch A)
```

---

## Dispatch instructions

Send each batch as a separate `codex:codex-rescue` agent invocation with the exact contents of:

- `BATCH_A_pickers.md`
- `BATCH_B_webhook.md`
- `BATCH_C_run_viewer.md`
- `BATCH_D_templates.md`
- `BATCH_E_polish.md` (after A–D complete)

Each prompt is self-contained and tells Codex:
- What to read first
- Exactly what to change
- Exact code where non-trivial
- Verification gate
- What to report back

Then after E completes, dispatch `INTEGRATION_GATE.md` as a final verification agent.

Total estimated wall-clock: ~30–45 min if 4 parallel + 1 sequential + integration. ~2h sequential.
