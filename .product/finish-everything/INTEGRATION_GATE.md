# Integration gate — run after all batches A–E complete

**You are Codex.** Working dir: `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`. Don't commit, don't push. This is a verification-only pass.

## Purpose

Five parallel/sequential batches just landed. Each verified its own gates locally. This pass confirms they compose correctly:

- No cross-batch type errors (e.g. Batch B added a field to a type that Batch C now consumes)
- No cross-batch import cycles
- No regression in `verify-canonical.ts`
- Dev server boots clean, no hydration errors on the changed pages
- Total test count is at the expected ceiling (Batch B + C + D + E each added tests)

## Steps

### 1. Static gates (full repo)

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm tsx --conditions react-server scripts/verify-canonical.ts
```

Expected:
- typecheck: exit 0
- lint: 0 warnings, 0 errors
- test: ≥78 tests pass (74 baseline + ≥4 added across batches B/C/D/E)
- probe: 23/23 PASS

### 2. Build smoke

```powershell
pnpm build
```

Must complete without errors. Catches issues that `next dev` (Turbopack) hides.

### 3. Grep audits — stragglers from cleanup

```powershell
# Should ALL be empty:
Select-String -Path "src/**/*.{ts,tsx},prisma/*" -Pattern "sheets\.watch_new_rows"
Select-String -Path "src/**/*.{ts,tsx}" -Pattern "BitrixCreateSmartProcessItem"
Select-String -Path "src/**/*.{ts,tsx}" -Pattern "TriggerPickerCards|ActionPickerCards|TRIGGER_OPTIONS|ACTION_GROUPS"
Select-String -Path "src/**/*.{ts,tsx}" -Pattern "console\.log"
```

If any return a hit, investigate. Removed code referenced by an unused import is the most common straggler.

### 4. Module catalog ↔ handler parity recount

Edit nothing. Just verify the counts:

```powershell
# Catalog entries:
Select-String -Path "src/lib/modules.ts" -Pattern "^\s+id:\s+`"[a-z._]+`"" | Measure-Object | Select-Object -ExpandProperty Count
# Should print 23 (was 24; sheets.watch_new_rows removed by Batch A)

# Handler entries:
Select-String -Path "src/server/core/module-handlers.ts" -Pattern "^\s+`"[a-z._]+`":\s+\w+Handler" | Measure-Object | Select-Object -ExpandProperty Count
# Should print 23 (HANDLERS map size)
```

### 5. Dev server boot

The dev server is already running on http://localhost:3000 (PID 51664). Stop it first to pick up changes, restart cleanly:

```powershell
Stop-Process -Id 51664 -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
pnpm dev *>&1 | Tee-Object -FilePath dev.log &
```

Wait ~10 seconds, then hit:

```powershell
curl -s -o $null -w "/login -> %{http_code}`n" http://localhost:3000/login
curl -s -o $null -w "/api/auth/csrf -> %{http_code}`n" http://localhost:3000/api/auth/csrf
curl -s -o $null -w "/api/trpc/modules.listTemplates -> %{http_code}`n" "http://localhost:3000/api/trpc/modules.listTemplates?batch=1&input=%7B%7D"
```

Expected: 200 / 200 / 200.

### 6. Playwright `/login` headless smoke (sanity)

```powershell
node scripts/qa-login.mjs
```

Expected: 0 page errors, 0 hydration warnings, 0 failed requests at both viewports.

### 7. Webhook receiver smoke (Batch B output)

```powershell
# 404 — bogus scenario
curl -s -o $null -w "bogus -> %{http_code}`n" -X POST -H "Content-Type: application/json" -H "X-Webhook-Secret: x" -d "{}" http://localhost:3000/api/webhook/bogus-id

# 401 — real scenario id but wrong secret (use a scenario you actually have with trigger.webhook;
# or skip this check if you don't have one — note in the report)
```

### 8. Final summary

Compose a single report:

- Static gates: PASS / FAIL with details
- Build: PASS / FAIL
- Grep audits: every line empty? confirm
- Catalog/handler counts: 23/23
- Dev boot: ports clean
- Playwright login smoke: 0/0/0
- Webhook 404 / 401: as expected
- **One paragraph** with anything unexpected discovered

If everything passes, output:

```
INTEGRATION GATE: GREEN
```

If anything fails, output:

```
INTEGRATION GATE: BLOCKED — <one-line summary>
```

…and list the failed checks. Don't try to fix issues from here — the user routes the fix back to the responsible batch.
