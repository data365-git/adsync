// Capture 12 PNGs: 3 routes × {light, dark} × {desktop 1440x900, mobile 375x812}.
// Output: docs/screenshots/phase15/<route-slug>-<theme>-<breakpoint>.png

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROUTES = [
  { slug: "scenarios-list", path: "/scenarios" },
  { slug: "scenarios-new", path: "/scenarios/new" },
  { slug: "scenarios-builder", path: "/scenarios/scn_custom_01" },
];
const THEMES = ["light", "dark"];
const BREAKPOINTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const PORT = process.env.PORT ?? "3000";
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = resolve("docs/screenshots/phase15");
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

for (const theme of THEMES) {
  for (const bp of BREAKPOINTS) {
    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      colorScheme: theme,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    // Set the theme via localStorage so next-themes picks it up on first paint.
    await page.addInitScript((t) => {
      try {
        window.localStorage.setItem("theme", t);
      } catch (_) {
        /* noop */
      }
    }, theme);

    for (const route of ROUTES) {
      const url = BASE + route.path;
      const file = resolve(OUT_DIR, `${route.slug}-${theme}-${bp.name}.png`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      // Give animations a moment to settle, then snapshot full page.
      await page.waitForTimeout(400);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
    }

    await context.close();
  }
}

await browser.close();
console.log("\nAll 12 screenshots written to docs/screenshots/phase15/");
