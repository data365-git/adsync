/**
 * Worker process entrypoint.
 *
 * Scheduling: setInterval — node-cron is NOT in package.json.
 * Adding node-cron requires orchestrator approval; using setInterval instead.
 *
 * dotenv: not installed. tsx (used via `pnpm worker`) does NOT auto-load .env.
 * We parse .env manually with a minimal inline parser so WORKER_TICK_INTERVAL_MS
 * and WORKER_ENABLED are available before Prisma initialises.
 */

import fs from "fs";
import path from "path";

// ── Inline .env loader (no dotenv dep) ────────────────────────────────────────
function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

// ── Check WORKER_ENABLED ──────────────────────────────────────────────────────
if (process.env.WORKER_ENABLED !== "true") {
  console.log("[worker] Disabled via WORKER_ENABLED — exiting.");
  process.exit(0);
}

const tickIntervalMs = parseInt(process.env.WORKER_TICK_INTERVAL_MS ?? "60000", 10);

console.log(`[worker] Starting. Tick interval: ${tickIntervalMs} ms`);

import { tick } from "./scheduler";

// Run one tick immediately on startup, then on interval
tick().catch((err: unknown) => console.error("[worker] Initial tick error:", err));

const timer = setInterval(() => {
  tick().catch((err: unknown) => console.error("[worker] Tick error:", err));
}, tickIntervalMs);

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`[worker] Received ${signal}, shutting down.`);
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
