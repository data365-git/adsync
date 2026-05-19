// Authenticated headless QA probe.
// Forges an Auth.js v5 JWT session cookie, drives Playwright through every
// dashboard route at 2 viewports, captures console errors, hydration warnings,
// failed requests, screenshots.
//
// Reads:  AUTH_SECRET from .env, user id from DB
// Writes: local/qa-snapshots/authed-<route>-<viewport>.png  +  authed-findings.json

import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { encode } from "@auth/core/jwt";
import { PrismaClient } from "@prisma/client";

const OUT = resolve("local/qa-snapshots");
mkdirSync(OUT, { recursive: true });

// ── Read AUTH_SECRET ──────────────────────────────────────────────────────────
const env = readFileSync(".env", "utf8");
const secretLine = env.split(/\r?\n/).find(
  (l) => l.startsWith("AUTH_SECRET=") || l.startsWith("NEXTAUTH_SECRET="),
);
if (!secretLine) {
  console.error("AUTH_SECRET / NEXTAUTH_SECRET missing in .env");
  process.exit(1);
}
const secret = secretLine.split("=", 2)[1].replace(/^['"]|['"]$/g, "").trim();

// ── Get a user from DB ────────────────────────────────────────────────────────
const db = new PrismaClient();
const user = await db.user.findFirst({
  select: { id: true, email: true, name: true, image: true },
});
await db.$disconnect();
if (!user) {
  console.error("No User in DB");
  process.exit(1);
}

// ── Forge Auth.js v5 JWT session cookie ───────────────────────────────────────
// On HTTP localhost the cookie is `authjs.session-token`; the salt equals the
// cookie name (Auth.js v5 convention — see src/middleware.ts).
const cookieName = "authjs.session-token";
const sessionToken = await encode({
  token: {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    picture: user.image ?? null,
  },
  secret,
  salt: cookieName,
  maxAge: 30 * 24 * 60 * 60, // 30 days
});

// ── Route inventory ───────────────────────────────────────────────────────────
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const ROUTES = [
  { name: "connections", path: "/connections" },
  { name: "scenarios", path: "/scenarios" },
  { name: "scenarios-new", path: "/scenarios/new" },
  { name: "runs", path: "/runs" },
  { name: "settings", path: "/settings" },
  { name: "ad-accounts", path: "/ad-accounts" },
];

const findings = {
  base: BASE,
  user: user.email,
  byRoute: {},
};

const browser = await chromium.launch({ headless: true });

for (const route of ROUTES) {
  findings.byRoute[route.name] = {};
  for (const vp of [{ tag: "mobile-375", w: 375, h: 812 }, { tag: "desktop-1280", w: 1280, h: 800 }]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
    });
    await ctx.addCookies([
      {
        name: cookieName,
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    const page = await ctx.newPage();
    const out = {
      url: BASE + route.path,
      status: null,
      finalUrl: null,
      title: null,
      console: [],
      pageErrors: [],
      failedRequests: [],
      hydrationWarnings: [],
      screenshot: null,
    };

    page.on("console", (m) => {
      const t = m.text();
      out.console.push({ type: m.type(), text: t });
      if (/hydrat/i.test(t)) out.hydrationWarnings.push(t);
    });
    page.on("pageerror", (e) =>
      out.pageErrors.push({ message: e.message, stack: e.stack?.split("\n").slice(0, 3).join(" | ") }),
    );
    page.on("requestfailed", (r) =>
      out.failedRequests.push({ url: r.url(), reason: r.failure()?.errorText }),
    );

    const allRequests = [];
    page.on("request", (req) => {
      if (req.isNavigationRequest()) {
        allRequests.push({ url: req.url(), cookie: req.headers().cookie ?? "" });
      }
    });
    const cookiesPre = await ctx.cookies(BASE);
    out.cookiesBeforeGoto = cookiesPre.map((c) => ({
      name: c.name,
      valueHead: c.value.slice(0, 40),
      valueTail: c.value.slice(-40),
      len: c.value.length,
      domain: c.domain,
      path: c.path,
    }));

    try {
      // Warm-up nav so Chromium considers the next request same-site.
      await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 15000 });
      const resp = await page.goto(BASE + route.path, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      out.status = resp?.status() ?? null;
      out.finalUrl = page.url();
      out.title = await page.title();
      out.navRequests = allRequests.map((r) => ({ url: r.url, cookieLen: r.cookie.length, cookieHead: r.cookie.slice(0, 60) }));
      const png = resolve(OUT, `authed-${route.name}-${vp.tag}.png`);
      await page.screenshot({ path: png, fullPage: true });
      out.screenshot = png;
    } catch (e) {
      out.error = String(e);
    }
    findings.byRoute[route.name][vp.tag] = out;
    await ctx.close();
  }
}

await browser.close();
writeFileSync(resolve(OUT, "authed-findings.json"), JSON.stringify(findings, null, 2));

// ── Compact report ────────────────────────────────────────────────────────────
console.log(`User: ${user.email}`);
console.log(`Base: ${BASE}\n`);
for (const route of ROUTES) {
  console.log(`## /${route.name === "scenarios-new" ? "scenarios/new" : route.name}`);
  for (const vp of ["mobile-375", "desktop-1280"]) {
    const r = findings.byRoute[route.name][vp];
    const pe = r.pageErrors.length;
    const fr = r.failedRequests.length;
    const hw = r.hydrationWarnings.length;
    const ce = r.console.filter((c) => c.type === "error").length;
    const status =
      pe + fr + hw === 0 && r.status && r.status < 400
        ? "OK"
        : "ISSUES";
    console.log(
      `  ${vp.padEnd(15)} status=${r.status} title="${r.title}" pageErr=${pe} failedReq=${fr} hydration=${hw} consoleErr=${ce} -> ${status}`,
    );
    if (r.finalUrl && r.finalUrl !== r.url) console.log(`    redirected to: ${r.finalUrl}`);
    if (pe) for (const e of r.pageErrors) console.log(`    pageError: ${e.message}`);
    if (fr) for (const f of r.failedRequests) console.log(`    failed: ${f.url} (${f.reason})`);
    if (hw) for (const h of r.hydrationWarnings) console.log(`    hydration: ${h.slice(0, 160)}`);
    if (ce) for (const c of r.console.filter((c) => c.type === "error")) console.log(`    consoleErr: ${c.text.slice(0, 160)}`);
  }
  console.log();
}
