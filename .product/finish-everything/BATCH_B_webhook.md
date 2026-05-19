# Batch B — Webhook receiver feature (end-to-end)

**You are Codex.** Working dir: `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`. Branch `phase-a-foundation`. Don't commit, don't push.

## Read first

- `CLAUDE.md` (runtime rules; new `app/api/**` route MUST declare `runtime = "nodejs"`)
- `.product/finish-everything/PLAN.md`
- `src/server/core/executor.ts` (how runs are kicked off; you'll reuse `executeRun`)
- `src/server/core/run-context.ts` (output seeding pattern — your route seeds the webhook body as the trigger output)
- `src/server/core/module-handlers.ts` lines 72-74 (current no-op `triggerWebhookHandler`)
- `src/server/api/routers/scenarios.ts` (how scenarios are looked up)

## Scope

`trigger.webhook` is in the catalog but has no inbound endpoint. External services have nowhere to POST. This batch ships the receiver end-to-end:

1. New public route: `POST /api/webhook/[scenarioId]` that authenticates by per-scenario secret, looks up the scenario, and triggers a run with the request body as upstream output.
2. Rewire `triggerWebhookHandler` to read the pre-seeded payload from `RunContext` (already structurally there — the trigger handler returns rows that the executor stores; the body comes pre-injected via `ctx.setOutput(0, [body])` by the receiver before `executeRun` walks steps).
3. Surface a unique webhook URL on the scenario detail UI (copy-able). Actually — **this UI piece is out of scope for Batch B**; we land the backend only. Note in your report that the URL surfacing is a follow-up.
4. Persist a per-scenario `webhookSecret` (random 32-byte hex on first save) so the route can verify `X-Webhook-Secret`.

---

## 1. Schema migration

**File:** `prisma/schema.prisma`

Add to the `Scenario` model:

```prisma
webhookSecret   String?   @db.Text   // hex-encoded; generated server-side on first webhook trigger save
```

Run migration:

```powershell
pnpm prisma migrate dev --name scenario_webhook_secret
```

Commit the generated SQL file under `prisma/migrations/<timestamp>_scenario_webhook_secret/migration.sql`.

## 2. Webhook secret generation on scenario save

**File:** `src/server/api/routers/scenarios.ts`

Find the `create` and `update` mutations. In both, when the scenario's first step has `moduleType === "trigger.webhook"`:
- On `create`: generate `webhookSecret = randomBytes(32).toString("hex")` and store.
- On `update`: only regenerate if `webhookSecret` is currently null (don't rotate on every save — that breaks live webhooks).

Use `import { randomBytes } from "crypto";` (Node built-in, already used elsewhere in oauth routes).

Example shape (adapt to existing code):

```ts
const isWebhookTrigger =
  input.steps[0]?.moduleType === "trigger.webhook";

// create branch:
const created = await db.scenario.create({
  data: {
    // ... existing fields ...
    webhookSecret: isWebhookTrigger ? randomBytes(32).toString("hex") : null,
  },
});

// update branch — only set if not already set and trigger is webhook:
const existing = await db.scenario.findUnique({ where: { id: input.id }, select: { webhookSecret: true } });
const nextSecret =
  isWebhookTrigger && !existing?.webhookSecret
    ? randomBytes(32).toString("hex")
    : undefined; // undefined → Prisma leaves the column unchanged

await db.scenario.update({
  where: { id: input.id },
  data: {
    // ... existing fields ...
    ...(nextSecret !== undefined ? { webhookSecret: nextSecret } : {}),
  },
});
```

Don't include the secret in any return shape that hits the client UNLESS it's the scenario detail query (which is fine — the UI needs to display it later).

## 3. New webhook receiver route

**Create:** `src/app/api/webhook/[scenarioId]/route.ts`

This is a public route (no NextAuth session). It authenticates via the per-scenario secret in the `X-Webhook-Secret` header.

```ts
import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { executeRun } from "~/server/core/executor";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256 * 1024; // 256 KB cap — defensive

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> },
) {
  const { scenarioId } = await params;

  // 1. Lookup scenario
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      userId: true,
      enabled: true,
      webhookSecret: true,
      steps: {
        orderBy: { position: "asc" },
        select: { moduleType: true, position: true },
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!scenario.enabled) {
    return NextResponse.json({ error: "scenario_disabled" }, { status: 409 });
  }
  if (scenario.steps[0]?.moduleType !== "trigger.webhook") {
    return NextResponse.json(
      { error: "not_a_webhook_scenario" },
      { status: 400 },
    );
  }
  if (!scenario.webhookSecret) {
    return NextResponse.json({ error: "no_secret_configured" }, { status: 500 });
  }

  // 2. Verify secret
  const provided = req.headers.get("x-webhook-secret") ?? "";
  // Constant-time compare to avoid timing leaks
  if (provided.length !== scenario.webhookSecret.length) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ scenario.webhookSecret.charCodeAt(i);
  }
  if (diff !== 0) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 3. Read body (size-capped)
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 4. Kick off run. executeRun is async; we await it because it's already non-throwing
  //    (catches errors internally and persists FAILED). We return runId for the caller.
  const headers: Record<string, string> = {};
  for (const [k, v] of req.headers.entries()) {
    if (k.toLowerCase().startsWith("x-") && !k.toLowerCase().includes("secret")) {
      headers[k] = v;
    }
  }
  const triggerPayload = {
    receivedAt: new Date().toISOString(),
    method: "POST",
    headers,
    body,
  };

  // Seed the trigger output via executeRun option (Batch B adds this — see below)
  const runId = await executeRun(scenarioId, "MANUAL", scenario.userId, {
    webhookTriggerPayload: triggerPayload,
  });

  return NextResponse.json({ ok: true, runId }, { status: 200 });
}
```

## 4. Wire `executeRun` to accept the webhook payload

**File:** `src/server/core/executor.ts`

Find the `ExecuteRunOptions` type (top of file). Extend it:

```ts
type ExecuteRunOptions = {
  rerunOf?: string;
  rerunFromPosition?: number;
  webhookTriggerPayload?: unknown;
};
```

Find the section right after `const ctx = new RunContext();` (around line 173). Add seeding logic alongside the existing rerun seeding:

```ts
if (options.webhookTriggerPayload !== undefined) {
  // Seed position 1 (the trigger step) with the webhook payload as a single row.
  // The triggerWebhookHandler will read this from ctx.getUpstreamRows(2) for step 2.
  ctx.setOutput(1, [options.webhookTriggerPayload]);
}
```

This must run BEFORE the step-execution loop. Place it directly after the rerun seeding block.

## 5. Update `triggerWebhookHandler`

**File:** `src/server/core/module-handlers.ts`

Replace the no-op handler (lines 72-74) with:

```ts
const triggerWebhookHandler: Handler = async (step, ctx, _userId) => {
  // The webhook receiver route seeds ctx.setOutput(1, [payload]) before run starts.
  // If executor passes nothing (manual test run), emit an empty pass-through row so
  // downstream steps can still be tested with mocked data.
  const seeded = ctx.getOutput(step.position) ?? [];
  if (seeded.length > 0) {
    return { rowCount: seeded.length, rows: seeded };
  }
  // Manual test of a webhook trigger — no real payload, so emit a documented sample.
  const sample = [
    {
      receivedAt: new Date().toISOString(),
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { event: "sample.test", id: "test-event" },
    },
  ];
  ctx.setOutput(step.position, sample);
  return { rowCount: sample.length, rows: sample };
};
```

If `RunContext.getOutput(position)` doesn't exist as a method, check `run-context.ts` for the right accessor (it may be `outputs.get(position)` or similar). Adapt accordingly.

## 6. Tests

Add a test file: `src/server/core/__tests__/webhook.test.ts`

Cover:
- Webhook handler returns the seeded payload when present
- Webhook handler returns a fallback sample row when nothing is seeded
- `executeRun` seeds position 1 when `webhookTriggerPayload` is passed

Use the existing test patterns (vitest, mock the db where needed).

---

## Verification gate

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm tsx --conditions react-server scripts/verify-canonical.ts
```

All must be:
- typecheck: exit 0
- lint: 0 warnings, 0 errors
- test: ≥75/75 (you added webhook tests)
- probe: 23/23 PASS (no probe changes needed; webhook handler change is internal)

Plus a smoke check:

```powershell
# Dev server is running on http://localhost:3000 (PID 51664). Test the new route:
$body = '{"event":"test","id":"x123"}'
$secret = "INVALID"
curl -s -o $null -w "no-secret -> %{http_code}`n" -X POST -H "Content-Type: application/json" -H "X-Webhook-Secret: $secret" -d $body http://localhost:3000/api/webhook/cmpb540fl0001pc9wjpyd5ppm
# Should return 401 (unauthorized — the secret is fake)
```

If you have a real scenario with a webhook trigger + secret, use that ID. If you don't, smoke-test only the 404 / 400 paths.

---

## Report back

- Files created / modified (paths only)
- Migration filename created under `prisma/migrations/`
- Gate results
- One sentence: status of the **follow-up UI work** (showing the webhook URL on `/scenarios/[id]` — explicitly out of scope for this batch)
