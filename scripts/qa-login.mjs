// Headless QA probe for /login — captures console errors, hydration mismatches,
// network failures, viewport screenshots at 375px (mobile) and 1280px (desktop).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("local/qa-snapshots");
mkdirSync(OUT, { recursive: true });

const URL = process.env.QA_URL ?? "http://localhost:3000/login";

const browser = await chromium.launch({ headless: true });

const findings = {
  url: URL,
  console: [],
  pageErrors: [],
  failedRequests: [],
  hydrationWarnings: [],
  screenshots: [],
};

async function probe(name, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    findings.console.push({ where: name, type: msg.type(), text });
    if (/hydration|hydrat/i.test(text)) {
      findings.hydrationWarnings.push({ where: name, text });
    }
  });
  page.on("pageerror", (err) => {
    findings.pageErrors.push({ where: name, message: err.message, stack: err.stack });
  });
  page.on("requestfailed", (req) => {
    findings.failedRequests.push({
      where: name,
      url: req.url(),
      failure: req.failure()?.errorText,
    });
  });

  const resp = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  const status = resp?.status();
  const title = await page.title();

  // Check that the Sign-in button exists
  const signInExists = await page.locator('button:has-text("Sign in")').count() > 0
    || await page.locator('a:has-text("Sign in")').count() > 0
    || await page.locator('button:has-text("Continue with Google")').count() > 0;

  const screenshotPath = resolve(OUT, `login-${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  findings.screenshots.push({ where: name, path: screenshotPath, viewport, status, title, signInExists });

  await ctx.close();
}

await probe("mobile-375", { width: 375, height: 700 });
await probe("desktop-1280", { width: 1280, height: 800 });

await browser.close();

writeFileSync(resolve(OUT, "login-findings.json"), JSON.stringify(findings, null, 2));

// Compact summary
console.log("Console messages:", findings.console.length);
console.log("Page errors:", findings.pageErrors.length);
console.log("Failed requests:", findings.failedRequests.length);
console.log("Hydration warnings:", findings.hydrationWarnings.length);
console.log("Screenshots:");
for (const s of findings.screenshots) {
  console.log(`  ${s.where} (${s.viewport.width}x${s.viewport.height}): status=${s.status} title="${s.title}" signInExists=${s.signInExists}`);
  console.log(`    path: ${s.path}`);
}

if (findings.pageErrors.length > 0) {
  console.log("\nPageErrors:");
  for (const e of findings.pageErrors) console.log(`  [${e.where}] ${e.message}`);
}
if (findings.hydrationWarnings.length > 0) {
  console.log("\nHydration:");
  for (const h of findings.hydrationWarnings) console.log(`  [${h.where}] ${h.text.slice(0, 200)}`);
}
if (findings.failedRequests.length > 0) {
  console.log("\nFailed requests:");
  for (const r of findings.failedRequests) console.log(`  [${r.where}] ${r.url} (${r.failure})`);
}
const errConsole = findings.console.filter(c => c.type === "error" || c.type === "warning");
if (errConsole.length > 0) {
  console.log("\nConsole errors/warnings:");
  for (const c of errConsole) console.log(`  [${c.where}] [${c.type}] ${c.text.slice(0, 200)}`);
}
