// Simple a11y check: load each route in headless chromium, run axe-core,
// fail if any "critical" or "serious" violations are found.
//
// Usage: node scripts/axe-check.mjs http://localhost:3000/route1 [route2...]

import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Usage: node scripts/axe-check.mjs <url1> [url2...]");
  process.exit(2);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let totalCritical = 0;
let totalSerious = 0;
const summaries = [];

for (const url of urls) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const critical = violations.filter((v) => v.impact === "critical");
  const serious = violations.filter((v) => v.impact === "serious");
  const moderate = violations.filter((v) => v.impact === "moderate");
  const minor = violations.filter((v) => v.impact === "minor");

  totalCritical += critical.length;
  totalSerious += serious.length;

  summaries.push({
    url,
    critical: critical.length,
    serious: serious.length,
    moderate: moderate.length,
    minor: minor.length,
    items: [...critical, ...serious].map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        target: n.target.join(" >> "),
        failureSummary: n.failureSummary,
        html: n.html.slice(0, 200),
      })),
    })),
  });
}

await browser.close();

for (const s of summaries) {
  console.log(`\n${s.url}`);
  console.log(
    `  critical: ${s.critical}  serious: ${s.serious}  moderate: ${s.moderate}  minor: ${s.minor}`,
  );
  if (s.items.length > 0) {
    for (const it of s.items) {
      console.log(`    [${it.impact}] ${it.id}: ${it.help}`);
      for (const n of it.nodes) {
        console.log(`      target: ${n.target}`);
        console.log(`      html: ${n.html}`);
        console.log(`      why:  ${n.failureSummary.replace(/\n/g, " | ")}`);
      }
    }
  }
}

console.log(
  `\nTotal critical: ${totalCritical}  Total serious: ${totalSerious}`,
);
process.exit(totalCritical + totalSerious > 0 ? 1 : 0);
