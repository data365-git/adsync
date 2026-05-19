# Dispatch — how to fire all batches in parallel

Copy-paste the contents of each batch file as the **prompt body** for a separate `codex:codex-rescue` (or equivalent Codex CLI session). The batches are file-isolated; running them in parallel is safe.

## Fire order

### Wave 1 — parallel (4 agents simultaneously)

| Slot | Prompt file | Expected wall-clock |
|---|---|---|
| Agent 1 | `BATCH_A_pickers.md` | 10–15 min |
| Agent 2 | `BATCH_B_webhook.md` | 15–20 min (Prisma migration) |
| Agent 3 | `BATCH_C_run_viewer.md` | 15–20 min |
| Agent 4 | `BATCH_D_templates.md` | 10–15 min |

Wait for all 4 to return. If any failed its gate, route the failure back to that batch only — don't re-run the green ones.

### Wave 2 — sequential (1 agent)

| Slot | Prompt file | Expected wall-clock |
|---|---|---|
| Agent 5 | `BATCH_E_polish.md` | 15–20 min (Prisma migration + cron-preview tests) |

### Wave 3 — integration verification

| Slot | Prompt file | Expected wall-clock |
|---|---|---|
| Agent 6 | `INTEGRATION_GATE.md` | 5 min |

## If Claude dispatches them directly

From inside Claude Code:

```
Agent(
  description="Batch A — pickers/validation/cleanup",
  subagent_type="codex:codex-rescue",
  prompt=<<contents of BATCH_A_pickers.md>>,
  run_in_background=true,
)
Agent(
  description="Batch B — webhook receiver",
  subagent_type="codex:codex-rescue",
  prompt=<<contents of BATCH_B_webhook.md>>,
  run_in_background=true,
)
Agent(
  description="Batch C — run viewer + retry + CSV",
  subagent_type="codex:codex-rescue",
  prompt=<<contents of BATCH_C_run_viewer.md>>,
  run_in_background=true,
)
Agent(
  description="Batch D — templates picker",
  subagent_type="codex:codex-rescue",
  prompt=<<contents of BATCH_D_templates.md>>,
  run_in_background=true,
)
```

Send all four in a single message (parallel tool calls). Claude will be re-invoked once each completes via the task-notification mechanism. When all four are green, dispatch Batch E. When E is green, dispatch the integration gate.

## Conflict triage

If two batches end up touching the same line:

- **Batch A wins on UI scaffolding** (it owns ScenarioBuilder, StepCard, StepConfigModal, modules.ts catalog).
- **Batch B wins on executor / run-context** (it owns the webhook payload seeding).
- **Batch C wins on runs router** (it adds the retry mutation).
- **Batch E wins on ScheduleConfig** (it owns the cron-preview integration).

If a real merge conflict surfaces in the working tree, resolve by adopting both diffs side-by-side — none of the planned changes overlap in the SAME hunk; they touch different sections of the same file.

## Final hand-off back to user

When the integration gate is GREEN, hand back to the user with:

- One-paragraph summary of what shipped (~6 bullets max)
- Untracked / modified file list (`git status --short`)
- One single proposed commit message (don't commit; they'll review and approve)
- Three suggested smoke tests for the user to click through (login → /scenarios/new template picker → connect Verify button → create webhook scenario and copy URL — if URL-display follow-up landed)
