# Batch E — Connection health, schedule preview

**You are Codex.** Working dir: `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`. Branch `phase-a-foundation`. Don't commit, don't push.

**Run AFTER Batches A–D complete.** This batch may touch `ScheduleConfig.tsx` (Batch A may also touch it indirectly via picker cleanup). Coordinate by running after A's gate is green.

## Read first

- `CLAUDE.md`
- `.product/finish-everything/PLAN.md`
- `src/components/connections/ConnectionCard.tsx`
- `src/components/connections/ConnectionsClient.tsx`
- `src/server/api/routers/connections.ts`
- `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

## Scope (P2)

1. **Connection health badge** — show `lastVerifiedAt` on each connection card. Add a "Verify now" button that runs a lightweight API ping and updates the timestamp + status. Today the status is set on connect/disconnect only; tokens can silently rot.
2. **Schedule next-run preview** — under the cron field in `ScheduleConfig.tsx`, render a live "Next run: …" line that recomputes when cron or timezone changes.

---

## 1. Schema migration: `OAuthConnection.lastVerifiedAt`

**File:** `prisma/schema.prisma`

Add to the `OAuthConnection` model:

```prisma
lastVerifiedAt   DateTime?
```

Run migration:

```powershell
pnpm prisma migrate dev --name oauth_connection_last_verified
```

## 2. New `verify` mutation on connections router

**File:** `src/server/api/routers/connections.ts`

Add:

```ts
verify: authedProcedure
  .input(z.object({ provider: z.enum(["google", "facebook", "bitrix"]) }))
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;
    let providerEnum: Provider;
    if (input.provider === "google") providerEnum = Provider.GOOGLE;
    else if (input.provider === "facebook") providerEnum = Provider.FACEBOOK;
    else providerEnum = Provider.BITRIX;

    const conn = await db.oAuthConnection.findUnique({
      where: { userId_provider: { userId, provider: providerEnum } },
    });
    if (!conn) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Not connected." });
    }

    // Lightweight provider-specific ping:
    // - Google:   drive.about.get with fields=user
    // - Facebook: /me?fields=id
    // - Bitrix:   /crm.dealcategory.list (already used by listDealCategories)
    let ok = false;
    let nextStatus: ConnectionStatus = ConnectionStatus.CONNECTED;
    try {
      if (input.provider === "google") {
        const { getGoogleAuthClient } = await import("~/integrations/google/oauth");
        const client = await getGoogleAuthClient(userId);
        const { google } = await import("googleapis");
        const drive = google.drive({ version: "v3", auth: client });
        await drive.about.get({ fields: "user" });
        ok = true;
      } else if (input.provider === "facebook") {
        const { getFbAccessToken } = await import("~/integrations/facebook/oauth");
        const token = await getFbAccessToken(userId);
        const ver = process.env.FB_GRAPH_API_VERSION ?? "v22.0";
        const r = await fetch(
          `https://graph.facebook.com/${ver}/me?fields=id&access_token=${token}`,
        );
        const j = (await r.json()) as { id?: string; error?: { message: string } };
        if (j.id) ok = true;
        else if (j.error) throw new Error(j.error.message);
      } else {
        // Bitrix: use existing client
        const { callBitrix } = await import("~/server/bitrix24/client");
        await callBitrix(userId, "crm.dealcategory.list", { start: 0 });
        ok = true;
      }
    } catch (e) {
      ok = false;
      nextStatus = ConnectionStatus.STALE;
    }

    await db.oAuthConnection.update({
      where: { userId_provider: { userId, provider: providerEnum } },
      data: {
        lastVerifiedAt: new Date(),
        status: ok ? ConnectionStatus.CONNECTED : nextStatus,
      },
    });

    return { ok, lastVerifiedAt: new Date() };
  }),
```

Adjust imports — `Provider` and `ConnectionStatus` enums likely already imported. `callBitrix` name may differ; grep the bitrix24 client for the right callable. If the import paths above don't compile, mirror existing patterns in the file.

Also extend `list` (the existing connections list query) to include `lastVerifiedAt` in the returned shape.

## 3. ConnectionCard UI

**File:** `src/components/connections/ConnectionCard.tsx`

Show `lastVerifiedAt` and add a "Verify now" button.

```tsx
{connection.lastVerifiedAt ? (
  <span className="text-xs text-muted-foreground">
    Last verified {relativeTime(new Date(connection.lastVerifiedAt))}
  </span>
) : (
  <span className="text-xs text-muted-foreground">Never verified</span>
)}

<Button
  type="button"
  variant="ghost"
  size="sm"
  disabled={verifyMutation.isPending}
  onClick={() => verifyMutation.mutate({ provider: connection.provider })}
  aria-label="Verify this connection"
>
  <RefreshCwIcon className={cn("size-3.5", verifyMutation.isPending && "animate-spin")} />
  <span>{verifyMutation.isPending ? "Verifying…" : "Verify"}</span>
</Button>
```

Wire the mutation at the top of the component:

```ts
const utils = api.useUtils();
const verifyMutation = api.connections.verify.useMutation({
  onSuccess: ({ ok }) => {
    void utils.connections.list.invalidate();
    if (ok) toast.success("Connection is healthy.");
    else toast.error("Connection ping failed — try reconnecting.");
  },
  onError: (e) => toast.error(`Verify failed: ${e.message}`),
});
```

`relativeTime()` likely exists already in this file or `src/components/ad-accounts/LastRunBadge.tsx`. Reuse, don't duplicate.

## 4. Schedule next-run preview

**File:** `src/components/scenarios/builder/modules/ScheduleConfig.tsx`

Below the cron expression input, render a small helper:

```tsx
<NextRunPreview cron={config.cronExpression} timezone={config.timezone} />
```

**Create:** `src/lib/cron-preview.ts`

```ts
// Pure helper — no React. Tested independently.
// Returns the next 3 firings of a 5-field cron, in the given IANA timezone,
// or { error: string } if the cron is invalid.

const FIELD_RANGES: Array<[number, number]> = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // dom
  [1, 12], // month
  [0, 6],  // dow (0 = Sun)
];

export function parseCronField(
  field: string,
  range: [number, number],
): number[] | null {
  // Support: "*", "5", "*/5", "5,10,15", "1-5"
  if (field === "*") {
    const out: number[] = [];
    for (let v = range[0]; v <= range[1]; v++) out.push(v);
    return out;
  }
  if (field.startsWith("*/")) {
    const step = Number(field.slice(2));
    if (!Number.isFinite(step) || step <= 0) return null;
    const out: number[] = [];
    for (let v = range[0]; v <= range[1]; v += step) out.push(v);
    return out;
  }
  const parts = field.split(",");
  const out: number[] = [];
  for (const p of parts) {
    if (p.includes("-")) {
      const [lo, hi] = p.split("-").map(Number);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      for (let v = lo; v <= hi; v++) {
        if (v < range[0] || v > range[1]) return null;
        out.push(v);
      }
    } else {
      const v = Number(p);
      if (!Number.isFinite(v) || v < range[0] || v > range[1]) return null;
      out.push(v);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export interface NextRunResult {
  next: Date[]; // 0..3 firings, in UTC
  timezone: string;
  error?: string;
}

export function computeNextRuns(
  cron: string,
  timezone: string,
  count: number,
  from: Date = new Date(),
): NextRunResult {
  if (!cron || cron.trim().split(/\s+/).length !== 5) {
    return { next: [], timezone, error: "Cron must be 5 space-separated fields." };
  }
  const fields = cron.trim().split(/\s+/);
  const parsed = fields.map((f, i) => parseCronField(f, FIELD_RANGES[i]!));
  if (parsed.some((p) => p === null)) {
    return { next: [], timezone, error: "Cron syntax error." };
  }
  const [minutes, hours, doms, months, dows] = parsed as number[][];

  // Brute-force walk minute by minute from `from`, up to 366 days ahead.
  const next: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  const limit = from.getTime() + 366 * 24 * 60 * 60 * 1000;

  while (cursor.getTime() <= limit && next.length < count) {
    cursor.setMinutes(cursor.getMinutes() + 1);
    // Render cursor in target timezone for field comparison
    const local = renderInTimezone(cursor, timezone);
    if (!local) {
      return { next: [], timezone, error: "Invalid timezone." };
    }
    if (
      minutes.includes(local.minute) &&
      hours.includes(local.hour) &&
      doms.includes(local.dom) &&
      months.includes(local.month) &&
      dows.includes(local.dow)
    ) {
      next.push(new Date(cursor.getTime()));
    }
  }
  return { next, timezone };
}

function renderInTimezone(
  d: Date,
  timezone: string,
): { minute: number; hour: number; dom: number; month: number; dow: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    const parts = fmt.formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    const month = Number(get("month"));
    const dom = Number(get("day"));
    const hour = Number(get("hour")) % 24; // some locales emit "24"
    const minute = Number(get("minute"));
    const wd = get("weekday") ?? "";
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
    if (dow < 0) return null;
    return { minute, hour, dom, month, dow };
  } catch {
    return null;
  }
}
```

Tests at `src/lib/__tests__/cron-preview.test.ts` — at minimum:
- `0 6 * * *` UTC → next firings at 06:00 daily
- `*/15 * * * *` → next firing every 15 minutes
- invalid cron → `error` populated
- invalid timezone → `error: "Invalid timezone."`

**Component:**

```tsx
// In ScheduleConfig.tsx, alongside the existing form fields
function NextRunPreview({ cron, timezone }: { cron: string; timezone: string }) {
  const result = React.useMemo(() => computeNextRuns(cron, timezone, 3), [cron, timezone]);
  if (result.error) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Next run preview unavailable — {result.error}
      </p>
    );
  }
  if (result.next.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No upcoming runs in the next year.
      </p>
    );
  }
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
      <p className="font-medium text-foreground">Upcoming runs ({timezone})</p>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        {result.next.map((d, i) => (
          <li key={i}>{formatter.format(d)}</li>
        ))}
      </ul>
    </div>
  );
}
```

Import `computeNextRuns` from `~/lib/cron-preview`.

**Hydration safety:** the `Date()` instantiation in `useMemo` is allowed because `useMemo` runs both server and client — but `new Date()` returns DIFFERENT values per render, which is a hydration mismatch source. **Use a stable reference:** pass `Date.now()` only inside an event handler, OR memoize against a stable seed `0` (use a fixed epoch in useMemo + recompute on client effect). Simplest: render `null` on first SSR, then mount-only:

```tsx
const [mounted, setMounted] = React.useState(false);
React.useEffect(() => setMounted(true), []);
if (!mounted) return null;
// then call computeNextRuns and render
```

That avoids any SSR/client mismatch.

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
- lint: 0 warnings/errors
- test: ≥78/78 (you added cron-preview tests)
- probe: 23/23 (unaffected)

Manual smoke:
- `/connections` shows "Verify" button on each connected card; clicking runs the ping; toast confirms
- `/scenarios/new` → pick Schedule trigger → enter `0 6 * * *` and timezone `Asia/Tashkent` → "Upcoming runs" appears showing 3 dates daily at 06:00
- Invalid cron → "Cron syntax error." message

---

## Report back

- Files created / modified (paths)
- Migration filename
- Gate results
- Deviations (especially if Bitrix client import name differs)
